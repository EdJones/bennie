/**
 * Imports Rhode Island 2024-25 K-6 ELA curriculum data as district-level records.
 * Source: RIDE 2024-2025 K-12 Curriculum Survey Report
 *
 * Run with:
 *   node --env-file=.env.local scripts/import-ri-ela.js
 *
 * Or if your Node version doesn't support --env-file:
 *   npx dotenv -e .env.local -- node scripts/import-ri-ela.js
 *
 * The script will skip any district already present (matched by districtName + state).
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, query, where } from "firebase/firestore";

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

// K-6 ELA curricula extracted from the 2024-25 RIDE Curriculum Survey Report.
// Entries spanning beyond grade 6 (e.g. K-8) are truncated to K-6.
// Districts with no K-6 ELA data are omitted.
const RI_ELA_DATA = [
  {
    districtName: "Achievement First",
    curricula: [
      { gradeRange: "K-4", provider: "Great Minds", product: "Wit & Wisdom", year: "2016" },
    ],
  },
  {
    districtName: "Barrington",
    curricula: [
      {
        gradeRange: "K-5",
        provider: "OpenUp Resources",
        product: "EL Education K-8 Language Arts 2nd Ed.",
        year: "2019",
      },
    ],
  },
  {
    districtName: "Blackstone Valley Prep Mayoral Academy",
    curricula: [
      {
        gradeRange: "K-4",
        provider: "Imagine Learning",
        product: "EL Education K-5 Language Arts 2nd Ed.",
        year: "2019",
      },
    ],
  },
  {
    districtName: "Bristol Warren",
    curricula: [
      {
        gradeRange: "K-5",
        provider: "Houghton Mifflin Harcourt (HMH)",
        product: "Into Reading",
        year: "2020",
      },
    ],
  },
  {
    districtName: "Central Falls",
    curricula: [
      {
        gradeRange: "K-5",
        provider: "American Reading Company",
        product: "ARC Core",
        year: "2018",
      },
    ],
  },
  {
    districtName: "Chariho",
    curricula: [
      {
        gradeRange: "K-5",
        provider: "Houghton Mifflin Harcourt (HMH)",
        product: "Into Reading",
        year: "2020",
      },
    ],
  },
  {
    districtName: "Coventry",
    curricula: [
      {
        gradeRange: "K-5",
        provider: "OpenUp Resources",
        product: "EL Education K-8 Language Arts 2nd Ed.",
        year: "2019",
      },
    ],
  },
  {
    districtName: "Cumberland",
    curricula: [{ gradeRange: "K-5", provider: "McGraw Hill", product: "Wonders", year: "2020" }],
  },
  {
    districtName: "East Greenwich",
    curricula: [
      {
        gradeRange: "K-5",
        provider: "OpenUp Resources",
        product: "EL Education K-8 Language Arts 2nd Ed.",
        year: "2019",
      },
    ],
  },
  {
    districtName: "East Providence",
    curricula: [{ gradeRange: "K-5", provider: "McGraw Hill", product: "Wonders", year: "2023" }],
  },
  {
    districtName: "Excel Academy",
    curricula: [
      {
        gradeRange: "Grade 5",
        provider: "OpenUp Resources",
        product: "EL Education K-8 Language Arts 2nd Ed.",
        year: "2019",
      },
    ],
  },
  {
    districtName: "Exeter-West Greenwich",
    curricula: [
      {
        gradeRange: "K-1",
        provider: "Houghton Mifflin Harcourt (HMH)",
        product: "Into Reading",
        year: "2020",
      },
      {
        gradeRange: "2-5",
        provider: "OpenUp Resources",
        product: "EL Education K-8 Language Arts 2nd Ed.",
        year: "2019",
      },
    ],
  },
  {
    districtName: "Foster",
    curricula: [
      { gradeRange: "K-5", provider: "Great Minds", product: "Wit & Wisdom", year: "2016" },
    ],
  },
  {
    districtName: "Foster-Glocester",
    curricula: [
      { gradeRange: "K-5", provider: "Great Minds", product: "Wit & Wisdom", year: "2016" },
    ],
  },
  {
    districtName: "Glocester",
    curricula: [
      { gradeRange: "K-5", provider: "Savvas Learning", product: "ReadyGEN", year: "2016" },
    ],
  },
  {
    districtName: "Highlander",
    curricula: [
      {
        gradeRange: "K-5",
        provider: "Imagine Learning",
        product: "EL Education K-5 Language Arts 2nd Ed.",
        year: "2019",
      },
    ],
  },
  {
    districtName: "International Charter",
    curricula: [
      {
        gradeRange: "K-5",
        provider: "American Reading Company",
        product: "ARC Core",
        year: "2017",
      },
    ],
  },
  {
    districtName: "Jamestown",
    curricula: [
      {
        gradeRange: "K-5",
        provider: "Houghton Mifflin Harcourt (HMH)",
        product: "Into Reading",
        year: "2020",
      },
    ],
  },
  {
    districtName: "Johnston",
    curricula: [
      { gradeRange: "K-5", provider: "Savvas Learning", product: "myView Literacy", year: "2020" },
    ],
  },
  {
    districtName: "Kingston Hill",
    curricula: [{ gradeRange: "K-5", provider: "McGraw Hill", product: "Wonders", year: "2023" }],
  },
  {
    districtName: "Lincoln",
    curricula: [
      {
        gradeRange: "K-5",
        provider: "OpenUp Resources",
        product: "EL Education K-8 Language Arts 2nd Ed.",
        year: "2019",
      },
    ],
  },
  {
    districtName: "Little Compton",
    curricula: [
      {
        gradeRange: "K-5",
        provider: "OpenUp Resources",
        product: "EL Education K-8 Language Arts 2nd Ed.",
        year: "2019",
      },
    ],
  },
  {
    districtName: "Middletown",
    curricula: [
      {
        gradeRange: "K-5",
        provider: "Houghton Mifflin Harcourt (HMH)",
        product: "Into Reading",
        year: "2020",
      },
    ],
  },
  {
    districtName: "Narragansett",
    curricula: [
      {
        gradeRange: "K-4",
        provider: "Amplify",
        product: "Core Knowledge Language Arts (CKLA)",
        year: "2015",
      },
    ],
  },
  {
    districtName: "New Shoreham",
    curricula: [
      {
        gradeRange: "K-4",
        provider: "Amplify",
        product: "Core Knowledge Language Arts (CKLA)",
        year: "2015",
      },
      {
        gradeRange: "Grade 5",
        provider: "Imagine Learning",
        product: "EL Education K-5 Language Arts 2nd Ed.",
        year: "2019",
      },
    ],
  },
  {
    districtName: "Newport",
    curricula: [
      {
        gradeRange: "K-5",
        provider: "Houghton Mifflin Harcourt (HMH)",
        product: "Into Reading",
        year: "2020",
      },
    ],
  },
  {
    districtName: "North Kingstown",
    curricula: [
      { gradeRange: "K-5", provider: "Great Minds", product: "Wit & Wisdom", year: "2016" },
    ],
  },
  {
    districtName: "North Providence",
    curricula: [{ gradeRange: "K-5", provider: "McGraw Hill", product: "Wonders", year: "2020" }],
  },
  {
    districtName: "North Smithfield",
    curricula: [
      { gradeRange: "K-5", provider: "Savvas Learning", product: "ReadyGEN", year: "2016" },
    ],
  },
  {
    districtName: "Nuestro Mundo",
    curricula: [
      {
        gradeRange: "K-5",
        provider: "American Reading Company",
        product: "ARC Core",
        year: "2018",
      },
    ],
  },
  {
    districtName: "Paul Cuffee",
    curricula: [
      {
        gradeRange: "K-5",
        provider: "OpenUp Resources",
        product: "EL Education K-8 Language Arts 2nd Ed.",
        year: "2019",
      },
    ],
  },
  {
    districtName: "Pawtucket",
    curricula: [
      { gradeRange: "K-5", provider: "Savvas Learning", product: "myView Literacy", year: "2020" },
    ],
  },
  {
    districtName: "Portsmouth",
    curricula: [{ gradeRange: "K-5", provider: "McGraw Hill", product: "Wonders", year: "2023" }],
  },
  {
    districtName: "Providence",
    curricula: [
      {
        gradeRange: "K-5",
        provider: "American Reading Company",
        product: "ARC Core",
        year: "2018",
      },
    ],
  },
  {
    districtName: "Providence Preparatory",
    curricula: [
      {
        gradeRange: "Grade 5",
        provider: "OpenUp Resources",
        product: "EL Education K-8 Language Arts 2nd Ed.",
        year: "2019",
      },
    ],
  },
  {
    districtName: "Rhode Island School for the Deaf",
    curricula: [{ gradeRange: "K-5", provider: "McGraw Hill", product: "Wonders", year: "2023" }],
  },
  {
    districtName: "RISE Prep",
    curricula: [
      { gradeRange: "K-6", provider: "Great Minds", product: "Wit & Wisdom", year: "2016" },
    ],
  },
  {
    districtName: "Scituate",
    curricula: [
      {
        gradeRange: "K-5",
        provider: "American Reading Company",
        product: "ARC Core",
        year: "2018",
      },
    ],
  },
  {
    districtName: "Segue Institute for Learning",
    curricula: [
      {
        gradeRange: "K-5",
        provider: "OpenUp Resources",
        product: "EL Education K-8 Language Arts 2nd Ed.",
        year: "2019",
      },
    ],
  },
  {
    districtName: "Smithfield",
    curricula: [
      { gradeRange: "K-5", provider: "Savvas Learning", product: "ReadyGEN", year: "2016" },
    ],
  },
  {
    districtName: "South Kingstown",
    curricula: [{ gradeRange: "K-5", provider: "McGraw Hill", product: "Wonders", year: "2020" }],
  },
  {
    districtName: "SouthSide Charter",
    curricula: [{ gradeRange: "K-5", provider: "McGraw Hill", product: "Wonders", year: "2020" }],
  },
  {
    districtName: "The Compass School",
    curricula: [
      {
        gradeRange: "K-2",
        provider: "Amplify",
        product: "Core Knowledge Language Arts (CKLA)",
        year: "2015",
      },
      {
        gradeRange: "3-6",
        provider: "OpenUp Resources",
        product: "EL Education K-8 Language Arts 2nd Ed.",
        year: "2019",
      },
    ],
  },
  {
    districtName: "The Hope Academy",
    curricula: [
      {
        gradeRange: "K-5",
        provider: "Amplify",
        product: "Core Knowledge Language Arts (CKLA)",
        year: "2015",
      },
    ],
  },
  {
    districtName: "The Learning Community",
    curricula: [
      { gradeRange: "K-6", provider: "Great Minds", product: "Wit & Wisdom", year: "2016" },
    ],
  },
  {
    districtName: "Tiverton",
    curricula: [
      { gradeRange: "K-5", provider: "Great Minds", product: "Wit & Wisdom", year: "2016" },
    ],
  },
  {
    districtName: "Trinity Academy for the Performing Arts",
    curricula: [
      {
        gradeRange: "Grade 5",
        provider: "OpenUp Resources",
        product: "EL Education K-8 Language Arts 2nd Ed.",
        year: "2019",
      },
    ],
  },
  {
    districtName: "Warwick",
    curricula: [
      { gradeRange: "K-5", provider: "Great Minds", product: "Wit & Wisdom", year: "2016" },
    ],
  },
  {
    districtName: "West Warwick",
    curricula: [
      {
        gradeRange: "K-5",
        provider: "Amplify",
        product: "Core Knowledge Language Arts (CKLA)",
        year: "2015",
      },
    ],
  },
  {
    districtName: "Westerly",
    curricula: [
      {
        gradeRange: "K-5",
        provider: "OpenUp Resources",
        product: "EL Education K-8 Language Arts 2nd Ed.",
        year: "2019",
      },
    ],
  },
  {
    districtName: "Woonsocket",
    curricula: [{ gradeRange: "K-5", provider: "McGraw Hill", product: "Wonders", year: "2023" }],
  },
];

async function importData() {
  // Fetch existing district-level RI records to avoid duplicates
  const existingSnap = await getDocs(
    query(collection(db, "schools"), where("state", "==", "RI"), where("level", "==", "district")),
  );
  const existingNames = new Set(existingSnap.docs.map((d) => d.data().districtName));

  let imported = 0;
  let skipped = 0;

  for (const entry of RI_ELA_DATA) {
    if (existingNames.has(entry.districtName)) {
      console.log(`Skipping (already exists): ${entry.districtName}`);
      skipped++;
      continue;
    }

    await addDoc(collection(db, "schools"), {
      state: "RI",
      districtId: "",
      districtName: entry.districtName,
      schoolId: null,
      schoolName: null,
      level: "district",
      elaCurricula: entry.curricula,
    });

    console.log(`Imported: ${entry.districtName}`);
    imported++;
  }

  console.log(`\nDone. Imported: ${imported}, Skipped: ${skipped}`);
  process.exit(0);
}

importData().catch((err) => {
  console.error(err);
  process.exit(1);
});
