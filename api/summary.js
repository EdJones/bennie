import { db } from "./_firebase.js";
import { collection, getDocs, query, where } from "firebase/firestore/lite";
import { getProgramForProduct } from "../src/data/curriculumCategories.js";

const CORE_CATEGORIES = new Set([
  "Balanced Literacy",
  "Basals",
  "Book-Centered & Knowledge-Building",
]);

const INTERVENTION_MATERIAL_TYPES = new Set([
  "Reading Intervention",
  "Both ELA Core and Reading Intervention",
]);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const CACHE = "public, s-maxage=300, stale-while-revalidate=60";

function toTopN(countMap, n = 20) {
  return Object.entries(countMap)
    .map(([programName, count]) => ({ programName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

function aggregate(schools, stateFilter) {
  const total = schools.length;
  const districts = schools.filter((s) => s.level === "district").length;
  const schoolCount = schools.filter((s) => s.level === "school").length;

  const stateMap = {};
  for (const s of schools) {
    if (!s.state) continue;
    stateMap[s.state] ??= { state: s.state, total: 0, districts: 0, schools: 0 };
    stateMap[s.state].total++;
    if (s.level === "district") stateMap[s.state].districts++;
    else stateMap[s.state].schools++;
  }
  const byState = Object.values(stateMap).sort((a, b) => a.state.localeCompare(b.state));

  const coreCounts = {};
  const foundationalCounts = {};
  const interventionCounts = {};

  for (const school of schools) {
    const seenCore = new Set();
    const seenFoundational = new Set();
    const seenIntervention = new Set();

    for (const entry of school.elaCurricula ?? []) {
      const product = entry?.product?.trim();
      if (!product) continue;

      const isIntervention = INTERVENTION_MATERIAL_TYPES.has(entry?.reportedMaterialType);
      const match = getProgramForProduct(product);

      if (isIntervention) {
        const name = match ? match.programName : product;
        if (!seenIntervention.has(name)) {
          seenIntervention.add(name);
          interventionCounts[name] = (interventionCounts[name] ?? 0) + 1;
        }
        continue;
      }

      if (!match) continue;

      if (CORE_CATEGORIES.has(match.categoryName) && !seenCore.has(match.programName)) {
        seenCore.add(match.programName);
        coreCounts[match.programName] = (coreCounts[match.programName] ?? 0) + 1;
      }

      if (
        match.categoryName === "Foundational / Phonics" &&
        !seenFoundational.has(match.programName)
      ) {
        seenFoundational.add(match.programName);
        foundationalCounts[match.programName] = (foundationalCounts[match.programName] ?? 0) + 1;
      }
    }

    for (const product of school.interventionProducts ?? []) {
      if (!product) continue;
      const match = getProgramForProduct(product);
      const name = match ? match.programName : product;
      if (!seenIntervention.has(name)) {
        seenIntervention.add(name);
        interventionCounts[name] = (interventionCounts[name] ?? 0) + 1;
      }
    }
  }

  return {
    total,
    districts,
    schools: schoolCount,
    statesCount: byState.length,
    ...(stateFilter ? {} : { byState }),
    topCoreCurricula: toTopN(coreCounts),
    topFoundationalCurricula: toTopN(foundationalCounts),
    topInterventions: toTopN(interventionCounts),
  };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  res.setHeader("Cache-Control", CACHE);

  const { state } = req.query;

  try {
    const constraints = state ? [where("state", "==", state.toUpperCase())] : [];
    const snap = await getDocs(query(collection(db, "schools"), ...constraints));
    const schools = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return res.status(200).json({ data: aggregate(schools, state) });
  } catch (err) {
    console.error("[api/summary]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
