/**
 * One-time migration: converts old flat ELA curriculum fields to the new
 * elaCurricula array schema and adds a `level` field.
 *
 * Run with:
 *   node --env-file=.env.local scripts/migrate-schema.js
 *
 * Or if your Node version doesn't support --env-file:
 *   npx dotenv -e .env.local -- node scripts/migrate-schema.js
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

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

async function migrate() {
  const snapshot = await getDocs(collection(db, "schools"));
  let migrated = 0;
  let skipped = 0;

  for (const snap of snapshot.docs) {
    const data = snap.data();

    if (data.elaCurricula !== undefined) {
      skipped++;
      continue;
    }

    const curricula = [];

    if (data.generalElaProvider) {
      curricula.push({
        gradeRange: "K-6",
        provider: data.generalElaProvider,
        product: data.generalElaProduct || "",
        year: data.generalElaYear || "",
      });
    }

    if (data.elaSameCurriculum === false && data.foundationsProvider) {
      curricula.push({
        gradeRange: "K-6",
        provider: data.foundationsProvider,
        product: data.foundationsProduct || "",
        year: data.foundationsYear || "",
      });
    }

    await updateDoc(doc(db, "schools", snap.id), {
      level: "school",
      elaCurricula: curricula,
      elaSameCurriculum: null,
      foundationsProvider: null,
      foundationsProduct: null,
      foundationsYear: null,
      generalElaProvider: null,
      generalElaProduct: null,
      generalElaYear: null,
    });

    console.log(`Migrated: ${data.schoolName || snap.id}`);
    migrated++;
  }

  console.log(`\nDone. Migrated: ${migrated}, Already up-to-date: ${skipped}`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
