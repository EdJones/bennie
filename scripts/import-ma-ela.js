/**
 * Fetches Massachusetts ELA K-6 Core curriculum data for public school districts
 * from the DESE Profiles portal and imports records to Firestore.
 *
 * Run with:
 *   node --env-file=.env.local scripts/import-ma-ela.js [--dry-run]
 *
 * Dedup key: districtId (district code) + state "MA". Existing records are skipped.
 */

import https from "https";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import * as XLSX from "xlsx";

const TARGET_GRADES = new Set(["K", "01", "02", "03", "04", "05", "06"]);
const GRADE_ORDER = ["K", "01", "02", "03", "04", "05", "06"];
const BASE_URL = "https://profiles.doe.mass.edu/statereport/Curriculumdata.aspx";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return httpGet(res.headers.location).then(resolve).catch(reject);
        }
        const chunks = [];
        const cookies = res.headers["set-cookie"] ?? [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({ body: Buffer.concat(chunks).toString(), cookies }));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

function httpPost(bodyStr, cookieStr) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "profiles.doe.mass.edu",
      path: "/statereport/Curriculumdata.aspx",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(bodyStr),
        "User-Agent": "Mozilla/5.0",
        ...(cookieStr ? { Cookie: cookieStr } : {}),
      },
    };
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

function extractViewState(html) {
  const vs = html.match(/name="__VIEWSTATE"\s+id="__VIEWSTATE"\s+value="([^"]+)"/)?.[1];
  const vsg = html.match(
    /name="__VIEWSTATEGENERATOR"\s+id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/,
  )?.[1];
  return { viewState: vs, viewStateGenerator: vsg };
}

async function downloadExcel() {
  console.log("Fetching VIEWSTATE...");
  const { body, cookies } = await httpGet(BASE_URL);
  const { viewState, viewStateGenerator } = extractViewState(body);
  if (!viewState) throw new Error("Could not extract __VIEWSTATE from page");

  const cookieStr = cookies.map((c) => c.split(";")[0]).join("; ");
  const params = new URLSearchParams({
    __VIEWSTATE: viewState,
    __VIEWSTATEGENERATOR: viewStateGenerator,
    ctl00$ContentPlaceHolder1$ddReportType: "D",
    ctl00$ContentPlaceHolder1$ddSubject: "ELA",
    ctl00$ContentPlaceHolder1$ddGrade: "ALL",
    ctl00$ContentPlaceHolder1$ddProduct: "ALL~",
    ctl00$ContentPlaceHolder1$hfExport: "Excel",
    ctl00$ContentPlaceHolder1$btnViewReport: "View Report",
  });

  console.log("Downloading Excel export...");
  return httpPost(params.toString(), cookieStr);
}

function gradeDisplay(g) {
  return g === "K" ? "K" : String(parseInt(g, 10));
}

function collapseToRange(sortedGrades) {
  if (sortedGrades.length === 0) return null;
  if (sortedGrades.length === 1) return gradeDisplay(sortedGrades[0]);
  return `${gradeDisplay(sortedGrades[0])}-${gradeDisplay(sortedGrades[sortedGrades.length - 1])}`;
}

function parseProduct(raw) {
  const str = raw?.trim() ?? "";
  if (!str) return { product: null, year: null };
  const match = str.match(/^(.+?)\s*\((\d{4})\)\s*$/);
  if (match) return { product: match[1].trim(), year: match[2] };
  return { product: str, year: null };
}

function buildCurricula(gradeProductMap) {
  // Invert: product -> [grades]
  const productGrades = new Map();
  for (const [grade, products] of gradeProductMap) {
    for (const prod of products) {
      if (!productGrades.has(prod)) productGrades.set(prod, []);
      productGrades.get(prod).push(grade);
    }
  }

  const result = [];
  for (const [prod, grades] of productGrades) {
    const sorted = [...new Set(grades)].sort(
      (a, b) => GRADE_ORDER.indexOf(a) - GRADE_ORDER.indexOf(b),
    );
    const { product, year } = parseProduct(prod);
    result.push({ gradeRange: collapseToRange(sorted), provider: null, product, year });
  }

  result.sort((a, b) => {
    const aFirst = a.gradeRange?.split("-")[0] ?? "K";
    const bFirst = b.gradeRange?.split("-")[0] ?? "K";
    const ai = aFirst === "K" ? 0 : parseInt(aFirst, 10);
    const bi = bFirst === "K" ? 0 : parseInt(bFirst, 10);
    return ai - bi;
  });

  return result;
}

function parseExcel(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  // Row 0 is the title, row 1 is headers, data starts at row 2
  const districts = new Map(); // districtCode -> { districtName, gradeProductMap }

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    const districtName = String(row[0] ?? "").trim();
    const districtCode = String(row[1] ?? "").trim();
    const grade = String(row[3] ?? "").trim();
    const fs = String(row[4] ?? "").trim();
    const rawProduct = String(row[6] ?? "").trim();
    const instructionUse = String(row[7] ?? "").trim();

    if (!districtCode || !TARGET_GRADES.has(grade)) continue;
    if (fs === "Y") continue; // foundational skills variant — separate row set
    if (instructionUse !== "Core") continue;
    if (!rawProduct) continue;

    if (!districts.has(districtCode)) {
      districts.set(districtCode, { districtName, gradeProductMap: new Map() });
    }
    const entry = districts.get(districtCode);
    if (!entry.gradeProductMap.has(grade)) entry.gradeProductMap.set(grade, new Set());

    // Some cells contain multiple products separated by newlines
    for (const p of rawProduct
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean)) {
      entry.gradeProductMap.get(grade).add(p);
    }
  }

  return districts;
}

async function importData() {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) console.log("DRY RUN — no data will be written.\n");

  const excelBuffer = await downloadExcel();
  console.log(`Downloaded ${excelBuffer.length.toLocaleString()} bytes.\n`);

  const districts = parseExcel(excelBuffer);
  console.log(`Parsed ${districts.size} districts with K-6 Core ELA data.\n`);

  if (dryRun) {
    for (const [code, { districtName, gradeProductMap }] of districts) {
      const curricula = buildCurricula(gradeProductMap);
      console.log(`${districtName} (${code}):`);
      for (const c of curricula) {
        console.log(
          `  ${String(c.gradeRange).padEnd(6)} ${c.product}${c.year ? ` (${c.year})` : ""}`,
        );
      }
    }
    console.log(`\n${districts.size} districts parsed. Run without --dry-run to import.`);
    process.exit(0);
  }

  const existingSnap = await getDocs(
    query(collection(db, "schools"), where("state", "==", "MA"), where("level", "==", "district")),
  );
  const existingCodes = new Set(existingSnap.docs.map((d) => d.data().districtId).filter(Boolean));

  let imported = 0;
  let skipped = 0;

  for (const [code, { districtName, gradeProductMap }] of districts) {
    if (existingCodes.has(code)) {
      console.log(`  skip (exists): ${districtName}`);
      skipped++;
      continue;
    }

    const curricula = buildCurricula(gradeProductMap);

    await addDoc(collection(db, "schools"), {
      state: "MA",
      level: "district",
      districtId: code,
      districtName,
      schoolId: null,
      schoolName: null,
      elaCurricula: curricula,
      source: "ma-dese-curriculum-report",
      sourceUrl: BASE_URL,
      sourceOrganization: "Massachusetts DESE",
      importedAt: Timestamp.now(),
    });

    console.log(`  imported: ${districtName} (${code}) — ${curricula.length} curriculum entries`);
    imported++;
    existingCodes.add(code);
  }

  console.log(`\nDone. Imported: ${imported}, Skipped: ${skipped}`);
  process.exit(0);
}

importData().catch((err) => {
  console.error(err);
  process.exit(1);
});
