/**
 * Maps the free-text tier2Materials field on MN district records to canonical
 * product names from interventionProducts.js, writing them to interventionProducts[].
 *
 * Run (dry run):  node --env-file=.env scripts/backfill-mn-interventions.js
 * Run (write):    node --env-file=.env scripts/backfill-mn-interventions.js --write
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
const DRY_RUN = !process.argv.includes("--write");

// Order matters: more specific patterns must come before broader ones.
// Each token from tier2Materials is matched against these in order;
// first match wins for that token.
const PRODUCT_PATTERNS = [
  // Wilson Language Training
  {
    p: ["wilson reading system", "wilson reading strategies", "wilson reading"],
    c: "Wilson Reading System",
  },
  { p: ["fundations", "the fundations"], c: "Fundations" },
  { p: ["just words"], c: "Just Words" },

  // Barton
  { p: ["barton reading", "barton system", "the barton"], c: "Barton Reading & Spelling System" },

  // Sonday
  { p: ["sonday system 2"], c: "Sonday System 2" },
  { p: ["sonday"], c: "Sonday System 1" },

  // SIPPS
  { p: ["sipps challenge"], c: "SIPPS Challenge" },
  { p: ["sipps plus"], c: "SIPPS Plus" },
  { p: ["sipps extension"], c: "SIPPS Extension" },
  { p: ["sipps"], c: "SIPPS Beginning" },

  // Read Naturally
  { p: ["read naturally live"], c: "Read Naturally Live" },
  {
    p: [
      "read naturally",
      "read narturally",
      "read narurally",
      "reading naturally",
      "read naturaly",
    ],
    c: "Read Naturally Live",
  },

  // Voyager Sopris
  { p: ["rewards reading", "reward interventions", "rewards"], c: "REWARDS" },
  {
    p: ["six minute solution", "6 minute solution", "6 minute soution", "18 minute solution"],
    c: "Six Minute Solutions",
  },
  { p: ["language! live", "language! by voyager", "language live"], c: "Language! Live" },
  { p: ["language!"], c: "Language! Live" },
  { p: ["read well", "readwell"], c: "Read Well" },

  // Scholastic
  { p: ["read 180", "read180", "read 180/s44"], c: "Read 180" },
  { p: ["system 44", "system44"], c: "System 44" },

  // Lexia
  {
    p: ["lexia core 5", "lexia core5", "lexia reading", "lexia powerup", "lexia"],
    c: "Lexia Core5 Reading",
  },

  // Curriculum Associates
  { p: ["phonics for reading"], c: "Phonics for Reading" },
  {
    p: ["iready instruction", "i-ready instruction", "iready reading intervention", "iready"],
    c: "i-Ready Instruction",
  },

  // Lindamood-Bell (specific before general)
  { p: ["seeing stars", "linda mood-bell seeing stars"], c: "Seeing Stars" },
  {
    p: ["visualizing and verbalizing", "linda mood-bell visual"],
    c: "Visualizing and Verbalizing",
  },
  { p: ["rave-o"], c: "RAVE-O" },
  {
    p: ["lips", "lipps", "lindamood phoneme", "linda mood-bell", "lindamood-bell"],
    c: "LiPS (Lindamood Phoneme Sequencing)",
  },

  // Fountas & Pinnell LLI
  {
    p: [
      "leveled literacy intervention",
      "lli",
      "f & p lli",
      "f& p lli",
      "f &p lli",
      "fountas & pinnell leveled",
      "fountas and pinnell leveled",
      "benchmark literacy intervention support /fountas & pinnell",
    ],
    c: "Leveled Literacy Intervention (LLI)",
  },

  // Really Great Reading
  { p: ["phonics blitz"], c: "Phonics Blitz" },
  { p: ["phonics boost"], c: "Phonics Boost" },
  { p: ["really great reading"], c: "Phonics Blitz" },

  // S.P.I.R.E.
  { p: ["spire", "s.p.i.r.e", "spire program"], c: "S.P.I.R.E." },

  // All About Reading
  { p: ["all about reading"], c: "All About Reading" },

  // Great Leaps
  { p: ["great leaps", "great lepas", "great leps"], c: "Great Leaps Reading" },

  // Fast ForWord
  {
    p: ["fast forword", "fastforword", "fast forward reading", "fast for success"],
    c: "Fast ForWord",
  },

  // SRA / McGraw Hill (corrective before mastery — both contain "reading")
  { p: ["corrective reading", "sra corrective"], c: "Corrective Reading" },
  { p: ["reading mastery"], c: "Reading Mastery" },
  { p: ["spelling mastery"], c: "Spelling Mastery" },

  // My Sidewalks
  { p: ["my sidewalks"], c: "My Sidewalks on Reading Street" },

  // EPS
  { p: ["recipe for reading"], c: "Recipe for Reading" },
  { p: ["preventing academic failure", " paf"], c: "Preventing Academic Failure (PAF)" },
  { p: ["explode the code", "explore the code"], c: "Explode the Code" },

  // Earobics
  { p: ["earobics", "earrobics"], c: "Earobics" },

  // Learning A-Z
  { p: ["raz kids", "raz-kids"], c: "Raz-Kids" },
  { p: ["reading a-z", "reading a to z", "a to z learning", "learning a-z"], c: "Reading A-Z" },

  // Heggerty
  {
    p: ["heggerty", "heggerity", "haggerty phonemic"],
    c: "Heggerty Phonemic Awareness Curriculum",
  },

  // Words Their Way
  { p: ["words their way"], c: "Words Their Way" },

  // PALS (K-PALS before PALS — more specific)
  { p: ["k-pals", "kpals", "k pals", "k-pals"], c: "K-PALS" },
  {
    p: ["peer assisted learning", "peer-assisted learning", "pals"],
    c: "PALS (Peer-Assisted Learning Strategies)",
  },

  // Reading Recovery
  { p: ["reading recovery"], c: "Reading Recovery" },

  // PRESS — many name variants in the MN data
  {
    p: [
      "path to reading excellence",
      "pathways to reading excellence",
      "press (path",
      "press phonics",
      "press fluency",
      "press interventions",
      "press phonemic",
      "press word",
      "press reading intervention",
      "press;",
      "and press",
      "press ",
    ],
    c: "PRESS (Path to Reading Excellence in School Sites)",
  },
  // PRESS as a standalone token
  { p: ["press"], c: "PRESS (Path to Reading Excellence in School Sites)" },

  // FCRR
  {
    p: [
      "florida center for reading research",
      "fcrr",
      "florida reading center",
      "florida center reading research",
      "florida reading research activit",
    ],
    c: "FCRR Student Center Activities",
  },
];

function tokenMatches(token, pat) {
  const escaped = pat.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(token);
}

function mapTier2(raw) {
  if (!raw || raw.trim().toLowerCase() === "information not available") return [];

  // Split by comma, bullet (●), or semicolon
  const tokens = raw
    .split(/[,●;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const matched = new Set();

  for (const token of tokens) {
    for (const { p, c } of PRODUCT_PATTERNS) {
      if (p.some((pat) => tokenMatches(token, pat))) {
        matched.add(c);
        break;
      }
    }
  }

  return [...matched].sort();
}

async function run() {
  console.log(DRY_RUN ? "DRY RUN — pass --write to commit changes\n" : "WRITING to Firestore\n");

  const snap = await getDocs(
    query(collection(db, "schools"), where("state", "==", "MN"), where("level", "==", "district")),
  );

  let mapped = 0;
  let empty = 0;
  const updates = [];

  for (const d of snap.docs) {
    const data = d.data();
    const products = mapTier2(data.tier2Materials);

    if (products.length > 0) {
      console.log(`${data.districtName}`);
      console.log(`  tier2: ${data.tier2Materials}`);
      console.log(`  → ${products.join(", ")}\n`);
      updates.push({ id: d.id, products });
      mapped++;
    } else {
      empty++;
    }
  }

  console.log(`\n${mapped} records with matches, ${empty} with no mappable products.`);

  if (DRY_RUN || updates.length === 0) {
    process.exit(0);
  }

  // Write in batches of 500
  let written = 0;
  for (let i = 0; i < updates.length; i += 500) {
    const batch = writeBatch(db);
    for (const { id, products } of updates.slice(i, i + 500)) {
      batch.update(doc(db, "schools", id), { interventionProducts: products });
    }
    await batch.commit();
    written += Math.min(500, updates.length - i);
  }

  console.log(`\nWrote ${written} records.`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
