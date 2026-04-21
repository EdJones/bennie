/**
 * Parses the Minnesota Reads Database TSV export and imports districts to Firestore.
 *
 * Steps:
 *   1. Save the raw copy-pasted data to scripts/mn-reads-raw.txt
 *   2. Run: node --env-file=.env scripts/seed-mn-districts.js
 *
 * Skips rows with no district name. Uses districtNumber as the dedup key —
 * if a district number already exists in Firestore (state=MN), that row is skipped.
 * Rows without a district number are matched by districtName instead.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, query, where } from "firebase/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

function clean(val) {
  if (!val) return null;
  const s = val.trim();
  if (!s || s === "Information Not Available" || s === "N/A" || s === "?") return null;
  return s;
}

function parsePct(val) {
  if (!val) return null;
  const s = val.trim().replace("%", "");
  if (s === "N/A" || s === "" || s === "Information Not Available") return null;
  if (s.startsWith(">")) return parseFloat(s.slice(1)) || null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function parseCharter(val) {
  if (!val) return null;
  const s = val.trim().toUpperCase();
  if (s === "Y") return true;
  if (s === "N") return false;
  return null;
}

function parseRow(line) {
  // Columns (tab-separated):
  // 0  School Name
  // 1  Charter (Y/N)
  // 2  District #
  // 3  SpEd (%)
  // 4  Free & Reduced Lunch (%)
  // 5  District Enrollment
  // 6  MCA Reading Proficiency %
  // 7  MCA Reading proficiency % for F&R
  // 8  Tier 1 Reading Curriculum Used
  // 9  Tier 2 Reading Interventions Materials
  // 10 Screening Vendor 1
  // 11 Screening Vendor 2
  // 12 Screening measures
  // 13 Progress Monitoring Measures
  const cols = line.split("\t");
  if (cols.length < 2) return null;

  const districtName = clean(cols[0]);
  if (!districtName) return null;

  const districtNumberRaw = clean(cols[2]);
  const districtNumber = districtNumberRaw ? parseInt(districtNumberRaw, 10) : null;

  const vendor1 = clean(cols[10]);
  const vendor2 = clean(cols[11]);
  const screeningVendors = [vendor1, vendor2].filter(
    (v) => v && v !== "Other" && v !== "other" && v !== "n/a",
  );

  return {
    districtName,
    districtNumber,
    charter: parseCharter(cols[1]),
    spedPct: parsePct(cols[3]),
    frlPct: parsePct(cols[4]),
    enrollment: clean(cols[5]),
    mcaReadingPct: parsePct(cols[6]),
    mcaFrlPct: parsePct(cols[7]),
    tier1Curriculum: clean(cols[8]),
    tier2Materials: clean(cols[9]),
    screeningVendors,
    screeningMeasures: clean(cols[12]),
    progressMonitoringMeasures: clean(cols[13]),
  };
}

async function importData() {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) console.log("DRY RUN — no data will be written to Firestore.\n");

  const rawPath = join(__dirname, "mn-reads-raw.txt");
  let raw;
  try {
    raw = readFileSync(rawPath, "utf8");
  } catch {
    console.error("Could not read scripts/mn-reads-raw.txt — does it exist?");
    process.exit(1);
  }

  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const rows = [];
  for (const line of lines) {
    if (line.startsWith("School Name") || line.startsWith("MN Reads")) continue;
    const row = parseRow(line);
    if (row) rows.push(row);
  }

  console.log(`Parsed ${rows.length} rows from raw file.\n`);

  if (dryRun) {
    // Show a summary table of what would be imported
    const seenNumbers = new Set();
    let dupes = 0;
    for (const entry of rows) {
      const key = entry.districtNumber ?? `name:${entry.districtName}`;
      const isDupe = seenNumbers.has(key);
      if (isDupe) dupes++;
      seenNumbers.add(key);
      console.log(
        [
          isDupe ? "[DUPE]" : "[    ]",
          String(entry.districtNumber ?? "—").padEnd(5),
          entry.districtName.padEnd(48),
          entry.charter === true ? "charter" : entry.charter === false ? "public " : "unknown",
          entry.enrollment?.padEnd(12) ?? "—           ",
          entry.tier1Curriculum ? `Tier1: ${entry.tier1Curriculum.slice(0, 40)}` : "Tier1: —",
        ].join("  "),
      );
    }
    console.log(`\n${rows.length} rows parsed, ${dupes} in-file duplicates.`);
    console.log("Run without --dry-run to import.");
    process.exit(0);
  }

  // Fetch existing MN district records
  const existingSnap = await getDocs(
    query(collection(db, "schools"), where("state", "==", "MN"), where("level", "==", "district")),
  );
  const existingByNumber = new Set(
    existingSnap.docs.map((d) => d.data().districtNumber).filter(Boolean),
  );
  const existingByName = new Set(existingSnap.docs.map((d) => d.data().districtName));

  let imported = 0;
  let skipped = 0;

  for (const entry of rows) {
    const isDupe =
      (entry.districtNumber && existingByNumber.has(entry.districtNumber)) ||
      (!entry.districtNumber && existingByName.has(entry.districtName));

    if (isDupe) {
      console.log(`  skip (exists): ${entry.districtName}`);
      skipped++;
      continue;
    }

    const record = {
      state: "MN",
      level: "district",
      districtName: entry.districtName,
      districtNumber: entry.districtNumber ?? null,
      charter: entry.charter,
      spedPct: entry.spedPct,
      frlPct: entry.frlPct,
      enrollment: entry.enrollment,
      mcaReadingPct: entry.mcaReadingPct,
      mcaFrlPct: entry.mcaFrlPct,
      elaCurricula: entry.tier1Curriculum
        ? [{ gradeRange: null, provider: null, product: entry.tier1Curriculum, year: null }]
        : [],
      tier2Materials: entry.tier2Materials,
      diagnosticAssessmentTools: entry.screeningVendors,
      screeningMeasures: entry.screeningMeasures,
      progressMonitoringMeasures: entry.progressMonitoringMeasures,
      schoolName: null,
      schoolId: null,
      districtId: "",
    };

    await addDoc(collection(db, "schools"), record);
    console.log(`  imported: ${entry.districtName}`);
    imported++;

    if (entry.districtNumber) existingByNumber.add(entry.districtNumber);
    else existingByName.add(entry.districtName);
  }

  console.log(`\nDone. Imported: ${imported}, Skipped: ${skipped}`);
  process.exit(0);
}

importData().catch((err) => {
  console.error(err);
  process.exit(1);
});
