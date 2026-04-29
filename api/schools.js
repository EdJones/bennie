import { db } from "./_firebase.js";
import { collection, getDocs, query, where, limit as fsLimit } from "firebase/firestore/lite";

function serializeDoc(data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = v && typeof v.toDate === "function" ? v.toDate().toISOString() : v;
  }
  return out;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const CACHE = "public, s-maxage=300, stale-while-revalidate=60";

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

  const { state, level } = req.query;
  const lim = Math.min(Math.max(parseInt(req.query.limit ?? "100", 10) || 100, 1), 500);

  const constraints = [];
  if (state) constraints.push(where("state", "==", state.toUpperCase()));
  if (level === "school" || level === "district") constraints.push(where("level", "==", level));

  try {
    const snap = await getDocs(query(collection(db, "schools"), ...constraints, fsLimit(lim + 1)));
    const hasMore = snap.docs.length > lim;
    const data = snap.docs
      .slice(0, lim)
      .map((d) => ({ id: d.id, ...serializeDoc(d.data()) }))
      .sort(
        (a, b) =>
          (a.state ?? "").localeCompare(b.state ?? "") ||
          (a.districtName ?? "").localeCompare(b.districtName ?? ""),
      );

    return res.status(200).json({ data, count: data.length, hasMore });
  } catch (err) {
    console.error("[api/schools]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
