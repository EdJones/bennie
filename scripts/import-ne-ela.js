/**
 * Imports Nebraska 2024-25 district-level ELA curriculum data from the NDE
 * HQIM Use by Nebraska Districts Excel file (District ELA sheet).
 *
 * Run with:
 *   node --env-file=.env scripts/import-ne-ela.js <path-to-xlsx> [--dry-run]
 *
 * Dedup key: districtName + state "NE". Existing records are skipped.
 */

import fs from "fs";
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

const SOURCE_URL = "https://www.nde.nebraska.gov/instruction/reading/hqim.html";

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

// District ELA sheet column indices (0-based, header row index 1)
const COL = {
  district: 0,
  esu: 1,
  elaK2: 2,
  elaK2Other: 3,
  adoptYearK2: 4,
  ela35: 5,
  ela35Other: 6,
  adoptYear35: 7,
};

function parseCurriculumStr(raw) {
  const str = (raw ?? "").trim();
  if (!str || str.toLowerCase() === "n/a") return null;

  // Find the matching opening paren for the LAST closing paren, respecting nesting.
  // This handles publishers like "Savvas Learning Company (f/k/a Pearson)".
  const lastClose = str.lastIndexOf(")");
  if (lastClose === -1) return { product: str, publisher: null, year: null };

  let depth = 0;
  let lastOpen = -1;
  for (let i = lastClose; i >= 0; i--) {
    if (str[i] === ")") depth++;
    else if (str[i] === "(") {
      depth--;
      if (depth === 0) {
        lastOpen = i;
        break;
      }
    }
  }
  if (lastOpen === -1) return { product: str, publisher: null, year: null };

  // inner may include nested parens, e.g. "Savvas Learning Company (f/k/a Pearson), 2020"
  const inner = str.substring(lastOpen + 1, lastClose);
  const productRaw = str.substring(0, lastOpen).trim().replace(/,\s*$/, "").trim();

  // Look for a trailing year: ", YYYY" or ", YYYY-YY"
  const yearMatch = inner.match(/,\s*(\d{4}(?:[–-]\d{2,4})?)\s*$/);
  let publisher, year;
  if (yearMatch) {
    year = yearMatch[1].split(/[-–]/)[0];
    publisher = inner.substring(0, inner.length - yearMatch[0].length).trim();
  } else if (/^\d{4}$/.test(inner.trim())) {
    publisher = null;
    year = inner.trim();
  } else {
    publisher = inner.trim();
    year = null;
  }

  return { product: productRaw || null, publisher: publisher || null, year: year || null };
}

function normalizeYear(raw) {
  const str = String(raw ?? "").trim();
  if (!str || str.toLowerCase() === "unknown" || str === "0") return null;
  const m = str.match(/(\d{4})/);
  return m ? m[1] : null;
}

function buildCurricula(k2Raw, k2Year, raw35, year35) {
  const k2 = parseCurriculumStr(k2Raw);
  const s35 = parseCurriculumStr(raw35);
  const y2 = normalizeYear(k2Year) ?? k2?.year ?? null;
  const y35 = normalizeYear(year35) ?? s35?.year ?? null;

  if (!k2 && !s35) return [];

  // If same curriculum for both ranges, merge into K-5
  if (
    k2 &&
    s35 &&
    k2.product?.toLowerCase() === s35.product?.toLowerCase() &&
    k2.publisher === s35.publisher
  ) {
    return [
      {
        gradeRange: "K-5",
        provider: k2.publisher ?? null,
        product: k2.product ?? null,
        year: y2 ?? y35 ?? null,
      },
    ];
  }

  const result = [];
  if (k2) {
    result.push({
      gradeRange: "K-2",
      provider: k2.publisher ?? null,
      product: k2.product ?? null,
      year: y2,
    });
  }
  if (s35) {
    result.push({
      gradeRange: "3-5",
      provider: s35.publisher ?? null,
      product: s35.product ?? null,
      year: y35,
    });
  }
  return result;
}

function parseSheet(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets["District ELA"];
  if (!ws) throw new Error('Sheet "District ELA" not found');

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  // Row 0 is note, row 1 is header, data starts at row 2
  const districts = new Map();

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    const districtName = String(row[COL.district] ?? "").trim();
    if (!districtName) continue;

    const curricula = buildCurricula(
      row[COL.elaK2],
      row[COL.adoptYearK2],
      row[COL.ela35],
      row[COL.adoptYear35],
    );

    if (curricula.length === 0) continue;

    districts.set(districtName, { districtName, curricula });
  }

  return districts;
}

async function importData() {
  const dryRun = process.argv.includes("--dry-run");
  const filePath = process.argv.find((a) => a.endsWith(".xlsx"));
  if (!filePath) {
    console.error(
      "Usage: node --env-file=.env scripts/import-ne-ela.js <path-to-xlsx> [--dry-run]",
    );
    process.exit(1);
  }

  if (dryRun) console.log("DRY RUN — no data will be written.\n");

  const buffer = fs.readFileSync(filePath);
  const districts = parseSheet(buffer);
  console.log(`Parsed ${districts.size} Nebraska districts with K-5 ELA data.\n`);

  if (dryRun) {
    for (const [name, { curricula }] of districts) {
      console.log(`${name}:`);
      for (const c of curricula) {
        console.log(
          `  ${String(c.gradeRange).padEnd(5)} ${c.product}${c.year ? ` (${c.year})` : ""}${c.provider ? ` — ${c.provider}` : ""}`,
        );
      }
    }
    console.log(`\n${districts.size} districts parsed. Run without --dry-run to import.`);
    process.exit(0);
  }

  const existingSnap = await getDocs(
    query(collection(db, "schools"), where("state", "==", "NE"), where("level", "==", "district")),
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
      state: "NE",
      level: "district",
      districtId: null,
      districtName,
      schoolId: null,
      schoolName: null,
      elaCurricula: curricula,
      source: "ne-nde-hqim-report",
      sourceUrl: SOURCE_URL,
      sourceOrganization: "Nebraska Department of Education",
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
