/**
 * Backfills source provenance fields onto existing MN district records
 * that were imported from the Minnesota Reads Database before attribution
 * was added to the seed script.
 *
 * Run: node --env-file=.env scripts/backfill-mn-source.js
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  writeBatch,
  query,
  where,
  Timestamp,
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

const SOURCE_FIELDS = {
  source: "mn-reads-database",
  sourceUrl: "https://carei.umn.edu/literacy-products/minnesota-reads-database",
  sourceOrganization: "CAREI, University of Minnesota",
  sourceYear: "2021-22",
  importedAt: Timestamp.now(),
};

async function backfill() {
  const snap = await getDocs(
    query(collection(db, "schools"), where("state", "==", "MN"), where("level", "==", "district")),
  );

  const toUpdate = snap.docs.filter((d) => !d.data().source);
  console.log(`Found ${snap.docs.length} MN district records, ${toUpdate.length} missing source.`);

  if (toUpdate.length === 0) {
    console.log("Nothing to do.");
    process.exit(0);
  }

  // Firestore batch writes are capped at 500 ops
  let updated = 0;
  for (let i = 0; i < toUpdate.length; i += 500) {
    const batch = writeBatch(db);
    for (const d of toUpdate.slice(i, i + 500)) {
      batch.update(doc(db, "schools", d.id), SOURCE_FIELDS);
    }
    await batch.commit();
    updated += Math.min(500, toUpdate.length - i);
    console.log(`  updated ${updated}/${toUpdate.length}`);
  }

  console.log(`\nDone. ${updated} records backfilled.`);
  process.exit(0);
}

backfill().catch((err) => {
  console.error(err);
  process.exit(1);
});
