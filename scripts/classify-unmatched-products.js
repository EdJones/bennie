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

// Build a taxonomy description for Claude
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

async function main() {
  // 1. Fetch all records and collect product string counts
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

  // 2. Filter to unmatched strings
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
  console.log("Classifying with Claude...\n");

  // 3. Ask Claude to classify
  const taxonomy = buildTaxonomyPrompt();
  const productList = unmatched.map(([p, n]) => `  "${p}" (${String(n)} schools)`).join("\n");

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
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
    messages: [
      {
        role: "user",
        content: `Classify these product strings:\n\n${productList}`,
      },
    ],
  });

  // 4. Parse and print results
  let result;
  try {
    const text = message.content[0].text.trim();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    result = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  } catch {
    console.error("Failed to parse Claude's response:");
    console.error(message.content[0].text);
    process.exit(1);
  }

  const countMap = Object.fromEntries(unmatched);
  const noMatch = result["no_match"] ?? [];
  const matched = Object.entries(result).filter(([k]) => k !== "no_match");

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
    console.log();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
