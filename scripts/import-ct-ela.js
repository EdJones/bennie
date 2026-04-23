/**
 * Imports Connecticut approved K-3 reading curriculum data by district from the
 * CT SDE portal and writes district-level records to Firestore.
 *
 * Run with:
 *   node --env-file=.env scripts/import-ct-ela.js [--dry-run]
 *
 * Dedup key: districtName + state "CT". Existing records are skipped.
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

const SOURCE_URL =
  "https://portal.ct.gov/sde/academic-office/center-for-literacy-research-and-reading-success/information-about-districts-and-charter-schools/approved-k-3-reading-curriculum-models-or-programs-by-district";

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
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

function cleanHtml(s) {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Splits "K – 2: [programs] Grade 3: [programs]" into grade-banded sections.
// Returns [{ gradeRange, text }] or null if no grade bands found.
function splitGradeBands(text) {
  // Matches patterns like "K – 2:", "K-2:", "Grade 3:", "Grades 3:"
  const bandRe = /(?:K\s*[–-]\s*\d+|Grades?\s*\d+)\s*:/gi;
  const matches = [...text.matchAll(bandRe)];
  if (matches.length < 2) return null;

  const bands = [];
  for (let i = 0; i < matches.length; i++) {
    const label = matches[i][0].replace(/\s*:\s*$/, "").trim();
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const sectionText = text.slice(start, end).trim();

    // Normalize label to a grade range string
    const gradeRange = label
      .replace(/Grades?\s*/i, "")
      .replace(/\s*[–-]\s*/g, "-")
      .trim();
    bands.push({ gradeRange, text: sectionText });
  }
  return bands;
}

// Parses "Publisher – Product" → { provider, product }
function parseProgram(raw) {
  const str = raw.replace(/\.$/, "").trim();
  if (!str) return null;
  const dashIdx = str.indexOf("–");
  if (dashIdx === -1) return { provider: null, product: str };
  return {
    provider: str.slice(0, dashIdx).trim() || null,
    product: str.slice(dashIdx + 1).trim() || null,
  };
}

// Splits a curriculum text block into individual program tokens.
function splitPrograms(text) {
  // Split on "; " or "; and " boundaries, not on "and" within a program name.
  return text
    .split(/;\s*(?:and\s+)?/)
    .map((s) => s.replace(/^and\s+/i, "").trim())
    .filter(Boolean);
}

function buildCurricula(currText) {
  const skip = ["did not report", "district-adopted program", "waiver"];
  if (skip.some((s) => currText.toLowerCase().includes(s))) return [];

  const bands = splitGradeBands(currText);

  if (bands) {
    // Grade-banded entry (e.g. Ashford, Wilton)
    const result = [];
    for (const { gradeRange, text } of bands) {
      for (const token of splitPrograms(text)) {
        const parsed = parseProgram(token);
        if (parsed?.product) result.push({ gradeRange, ...parsed, year: null });
      }
    }
    return result;
  }

  // All programs apply to K-3
  const result = [];
  for (const token of splitPrograms(currText)) {
    const parsed = parseProgram(token);
    if (parsed?.product) result.push({ gradeRange: "K-3", ...parsed, year: null });
  }
  return result;
}

function parsePage(html) {
  const rowRe =
    /<div class="k3-grid-row"[^>]*>.*?<div class="k3-district-name"[^>]*>(.*?)<\/div>.*?<div class="k3-curriculum-info"[^>]*>(.*?)<\/div>.*?<\/div>/gs;

  const districts = new Map();
  for (const match of html.matchAll(rowRe)) {
    const name = cleanHtml(match[1]);
    const currText = cleanHtml(match[2]);
    if (!name) continue;

    const curricula = buildCurricula(currText);
    if (curricula.length === 0) continue;

    districts.set(name, { districtName: name, curricula });
  }
  return districts;
}

async function importData() {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) console.log("DRY RUN — no data will be written.\n");

  console.log("Fetching CT SDE page...");
  const html = await httpGet(SOURCE_URL);
  const districts = parsePage(html);
  console.log(`Parsed ${districts.size} Connecticut districts with K-3 ELA data.\n`);

  if (dryRun) {
    for (const [name, { curricula }] of districts) {
      console.log(`${name}:`);
      for (const c of curricula) {
        console.log(
          `  ${String(c.gradeRange).padEnd(5)} ${c.product}${c.provider ? ` — ${c.provider}` : ""}`,
        );
      }
    }
    console.log(`\n${districts.size} districts parsed. Run without --dry-run to import.`);
    process.exit(0);
  }

  const existingSnap = await getDocs(
    query(collection(db, "schools"), where("state", "==", "CT"), where("level", "==", "district")),
  );
  const existingNames = new Set(
    existingSnap.docs.map((d) => d.data().districtName?.trim()).filter(Boolean),
  );

  let imported = 0;
  let skipped = 0;

  for (const [districtName, { curricula }] of districts) {
    if (existingNames.has(districtName)) {
      console.log(`  skip (exists): ${districtName}`);
      skipped++;
      continue;
    }

    await addDoc(collection(db, "schools"), {
      state: "CT",
      level: "district",
      districtId: null,
      districtName,
      schoolId: null,
      schoolName: null,
      elaCurricula: curricula,
      source: "ct-sde-k3-curriculum",
      sourceUrl: SOURCE_URL,
      sourceOrganization: "Connecticut State Department of Education",
      importedAt: Timestamp.now(),
    });

    console.log(`  imported: ${districtName} — ${curricula.length} curriculum entries`);
    imported++;
    existingNames.add(districtName);
  }

  console.log(`\nDone. Imported: ${imported}, Skipped: ${skipped}`);
  process.exit(0);
}

importData().catch((err) => {
  console.error(err);
  process.exit(1);
});
