import { db } from "../_firebase.js";
import { doc, getDoc } from "firebase/firestore/lite";

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

  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing id" });
  }

  try {
    const snap = await getDoc(doc(db, "schools", id));
    if (!snap.exists()) {
      return res.status(404).json({ error: "Not found" });
    }
    res.setHeader("Cache-Control", CACHE);
    return res.status(200).json({ data: { id: snap.id, ...serializeDoc(snap.data()) } });
  } catch (err) {
    console.error("[api/schools/[id]]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
