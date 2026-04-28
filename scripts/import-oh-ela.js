/**
 * Imports Ohio 2024-25 K-6 ELA curriculum data from the ODEW Report Card
 * HQIM in ELA and Reading Intervention CSV export.
 *
 * Run with:
 *   node --env-file=.env scripts/import-oh-ela.js <path-to-csv> [--dry-run]
 *
 * Dedup key: districtId (IRN) + state "OH". Existing records are skipped.
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

const SOURCE_URL =
  "https://reports.education.ohio.gov/report/report-card-data-hqim-in-ela-and-reading-intervention";

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

function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuote = false;
  for (const ch of line) {
    if (ch === '"' && !inQuote) inQuote = true;
    else if (ch === '"' && inQuote) inQuote = false;
    else if (ch === "," && !inQuote) {
      fields.push(current);
      current = "";
    } else current += ch;
  }
  fields.push(current.replace(/\r$/, ""));
  return fields;
}

function parseGrade(g) {
  const s = g.trim();
  if (s === "KG") return 0;
  if (s === "PS") return -1;
  return parseInt(s, 10);
}

function gradeDisplay(n) {
  return n === 0 ? "K" : String(n);
}

function formatGradeRange(dewGrades) {
  const parts = dewGrades.trim().split(/\s*-\s*/);
  const start = parseGrade(parts[0]);
  const rawEnd = parseGrade(parts[1] ?? parts[0]);
  if (isNaN(start) || isNaN(rawEnd)) return null;
  const end = Math.min(rawEnd, 6);
  if (start === end) return gradeDisplay(start);
  return `${gradeDisplay(start)}-${gradeDisplay(end)}`;
}

function parseProduct(raw) {
  const match = raw.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (match) return { product: match[1].trim(), provider: match[2].trim() };
  return { product: raw.trim(), provider: null };
}

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n").filter(Boolean);
  const rows = lines.slice(1).map(parseCSVLine);

  // Include orgs that serve students with ELA instruction
  const INCLUDED_ORG_TYPES = new Set([
    "Public District",
    "Community School",
    "STEM",
    "Joint Vocational School District",
  ]);

  const orgs = new Map(); // irn -> { name, orgType, curricula: Set entries }

  for (const row of rows) {
    const [irn, name, , orgType, rawProduct, , , reportedMaterialType, , dewGrades] = row;

    if (!INCLUDED_ORG_TYPES.has(orgType)) continue;
    if (!reportedMaterialType) continue;

    const start = parseGrade(dewGrades.trim().split(/\s*-\s*/)[0]);
    if (start < 0 || start > 6) continue; // skip PreK-only and 7+ rows

    if (!orgs.has(irn)) orgs.set(irn, { name, orgType, entries: [] });
    const { product, provider } = parseProduct(rawProduct);
    const gradeRange = formatGradeRange(dewGrades);
    orgs.get(irn).entries.push({ gradeRange, provider, product, year: null, reportedMaterialType });
  }

  // Dedup entries within each org (same product + gradeRange)
  for (const org of orgs.values()) {
    const seen = new Set();
    org.entries = org.entries.filter((e) => {
      const key = `${e.product}|${e.gradeRange}|${e.reportedMaterialType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  return orgs;
}

async function importData() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const csvPath = args.find((a) => !a.startsWith("--"));

  if (!csvPath) {
    console.error("Usage: node scripts/import-oh-ela.js <path-to-csv> [--dry-run]");
    process.exit(1);
  }

  if (dryRun) console.log("DRY RUN — no data will be written.\n");

  const orgs = parseCSV(csvPath);
  console.log(`Parsed ${orgs.size} orgs with K-6 ELA Core data.\n`);

  if (dryRun) {
    for (const [irn, { name, entries }] of orgs) {
      console.log(`${name} (${irn}):`);
      for (const e of entries) {
        console.log(
          `  ${String(e.gradeRange).padEnd(6)} ${e.product}${e.provider ? ` (${e.provider})` : ""} [${e.reportedMaterialType}]`,
        );
      }
    }
    console.log(`\n${orgs.size} orgs parsed. Run without --dry-run to import.`);
    process.exit(0);
  }

  const existingSnap = await getDocs(
    query(collection(db, "schools"), where("state", "==", "OH"), where("level", "==", "district")),
  );
  const existingIRNs = new Set(existingSnap.docs.map((d) => d.data().districtId).filter(Boolean));

  let imported = 0;
  let skipped = 0;

  for (const [irn, { name, entries }] of orgs) {
    if (existingIRNs.has(irn)) {
      console.log(`  skip (exists): ${name}`);
      skipped++;
      continue;
    }

    await addDoc(collection(db, "schools"), {
      state: "OH",
      level: "district",
      districtId: irn,
      districtName: name,
      schoolId: null,
      schoolName: null,
      elaCurricula: entries,
      source: "oh-odew-hqim-report-card",
      sourceUrl: SOURCE_URL,
      sourceOrganization: "Ohio Department of Education and Workforce",
      importedAt: Timestamp.now(),
    });

    console.log(`  imported: ${name} (${irn}) — ${entries.length} curriculum entries`);
    imported++;
    existingIRNs.add(irn);
  }

  console.log(`\nDone. Imported: ${imported}, Skipped: ${skipped}`);
  process.exit(0);
}

importData().catch((err) => {
  console.error(err);
  process.exit(1);
});
