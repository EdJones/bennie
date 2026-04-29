/**
 * Fixes Ohio records in Firestore that were imported with level="district"
 * but belong to non-district org types (Community School, STEM).
 *
 * These records need:
 *   level: "school"
 *   schoolId: <irn>       (moved from districtId)
 *   schoolName: <name>    (moved from districtName)
 *   districtId: null
 *   districtName: null
 *
 * Run with:
 *   node --env-file=.env scripts/fix-oh-school-levels.js <path-to-csv> [--dry-run]
 *
 * The same CSV used for the original import is required to recover orgType by IRN.
 */

import fs from "fs";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";

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

const DISTRICT_ORG_TYPES = new Set(["Public District", "Joint Vocational School District"]);

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

// Returns Map<irn, orgType> for every row in the CSV.
function parseOrgTypes(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n").filter(Boolean);
  const orgTypeByIrn = new Map();
  for (const line of lines.slice(1)) {
    const [irn, , , orgType] = parseCSVLine(line);
    if (irn && orgType && !orgTypeByIrn.has(irn)) {
      orgTypeByIrn.set(irn, orgType);
    }
  }
  return orgTypeByIrn;
}

async function fixLevels() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const csvPath = args.find((a) => !a.startsWith("--"));

  if (!csvPath) {
    console.error("Usage: node scripts/fix-oh-school-levels.js <path-to-csv> [--dry-run]");
    process.exit(1);
  }

  if (dryRun) console.log("DRY RUN — no data will be written.\n");

  const orgTypeByIrn = parseOrgTypes(csvPath);
  console.log(`Loaded org types for ${orgTypeByIrn.size} IRNs from CSV.\n`);

  // Fetch all OH records that are currently labeled as districts.
  const snap = await getDocs(
    query(collection(db, "schools"), where("state", "==", "OH"), where("level", "==", "district")),
  );

  let fixed = 0;
  let skipped = 0;
  let unknown = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const irn = data.districtId;

    if (!irn) {
      console.log(`  [skip] ${docSnap.id} — no districtId`);
      skipped++;
      continue;
    }

    const orgType = orgTypeByIrn.get(irn);

    if (!orgType) {
      console.log(`  [unknown] ${data.districtName} (${irn}) — IRN not in CSV, leaving as-is`);
      unknown++;
      continue;
    }

    if (DISTRICT_ORG_TYPES.has(orgType)) {
      skipped++;
      continue; // already correct
    }

    // This record should be level="school"
    console.log(`  [fix] ${data.districtName} (${irn}) — orgType "${orgType}" → level="school"`);

    if (!dryRun) {
      await updateDoc(doc(db, "schools", docSnap.id), {
        level: "school",
        schoolId: irn,
        schoolName: data.districtName,
        districtId: null,
        districtName: null,
      });
    }

    fixed++;
  }

  console.log(`\nDone. Fixed: ${fixed}, Already correct: ${skipped}, IRN not in CSV: ${unknown}`);
  if (dryRun && fixed > 0) console.log("Re-run without --dry-run to apply changes.");
  process.exit(0);
}

fixLevels().catch((err) => {
  console.error(err);
  process.exit(1);
});
