/**
 * Queries Firestore for all elaCurricula product strings, finds ones that don't
 * match any entry in curriculumCategories.js, and asks Claude to classify them.
 *
 * Run with:
 *   node --env-file=.env scripts/classify-unmatched-products.js
 *
 * Requires ANTHROPIC_API_KEY in .env in addition to the standard VITE_FIREBASE_* vars.
 */

import Anthropic from "@anthropic-ai/sdk";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { curriculumCategories, getProgramForProduct } from "../src/data/curriculumCategories.js";

const BATCH_SIZE = 60;

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
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildTaxonomyPrompt() {
  return curriculumCategories
    .map((cat) => {
      const programs = cat.programs
        .map((p) => `    - ${p.name} (e.g. ${p.products.slice(0, 2).join(", ")})`)
        .join("\n");
      return `  ${cat.name}:\n${programs}`;
    })
    .join("\n\n");
}

async function classifyBatch(taxonomy, batch) {
  const productList = batch.map(([p, n]) => `  "${p}" (${String(n)} schools)`).join("\n");

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8096,
    system: `You are classifying K-12 ELA curriculum product names into a taxonomy of known programs.
The taxonomy is:

${taxonomy}

Rules:
- Only classify strings you are highly confident about (year variants, publisher prefixes, subtitle variations of a known program).
- If a string is a district-specific or custom name with no clear match, put it in "no_match".
- Return ONLY valid JSON with this shape:
  {
    "Category > Program": ["matched string 1", "matched string 2"],
    "no_match": ["unrecognized string 1", ...]
  }
- Use the exact "Category > Program" format (e.g. "Basals > Into Reading").`,
    messages: [{ role: "user", content: `Classify these product strings:\n\n${productList}` }],
  });

  const text = message.content[0].text.trim();
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
}

async function main() {
  console.log("Fetching school records from Firestore...");
  const snapshot = await getDocs(collection(db, "schools"));
  const productCounts = {};
  for (const doc of snapshot.docs) {
    const data = doc.data();
    for (const entry of data.elaCurricula ?? []) {
      const p = entry.product?.trim();
      if (p) productCounts[p] = (productCounts[p] ?? 0) + 1;
    }
  }

  const unmatched = Object.entries(productCounts)
    .filter(([product]) => !getProgramForProduct(product))
    .sort((a, b) => b[1] - a[1]);

  if (unmatched.length === 0) {
    console.log("No unmatched product strings found — curriculumCategories.js is up to date.");
    process.exit(0);
  }

  const totalSchools = unmatched.reduce((sum, [, n]) => sum + n, 0);
  console.log(
    `Found ${unmatched.length} unmatched product strings across ${totalSchools} school records.`,
  );

  const batches = [];
  for (let i = 0; i < unmatched.length; i += BATCH_SIZE) {
    batches.push(unmatched.slice(i, i + BATCH_SIZE));
  }
  console.log(`Classifying in ${batches.length} batches...\n`);

  const taxonomy = buildTaxonomyPrompt();
  const merged = {};

  for (let i = 0; i < batches.length; i++) {
    process.stdout.write(`  Batch ${i + 1}/${batches.length}...`);
    try {
      const result = await classifyBatch(taxonomy, batches[i]);
      for (const [key, strings] of Object.entries(result)) {
        if (!merged[key]) merged[key] = [];
        merged[key].push(...strings);
      }
      console.log(" done");
    } catch (err) {
      console.log(` failed: ${String(err)}`);
    }
  }

  const countMap = Object.fromEntries(unmatched);
  const noMatch = merged["no_match"] ?? [];
  const matched = Object.entries(merged).filter(([k]) => k !== "no_match");

  console.log();

  if (matched.length > 0) {
    console.log("MATCHED — add to curriculumCategories.js:\n");
    for (const [key, strings] of matched.sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(`  ${key}`);
      for (const s of strings) {
        const count = Number(countMap[s]);
        const countStr = count > 0 ? ` (${count} schools)` : "";
        console.log(`    "${s}",${countStr}`);
      }
      console.log();
    }
  }

  if (noMatch.length > 0) {
    console.log("NO MATCH — leave in Supplemental Bundle:\n");
    for (const s of noMatch) {
      const count = Number(countMap[s]);
      const countStr = count > 0 ? ` (${count} schools)` : "";
      console.log(`  "${s}"${countStr}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
