export default async function handler(req, res) {
  const { state, search } = req.query;
  if (!state || !search) {
    return res.status(400).json({ error: "state and search are required" });
  }

  const params = new URLSearchParams({ state, search, limit: 1 });
  const upstream = await fetch(`https://api.cemd.org/districts/?${params}`);
  const data = await upstream.json();

  res.setHeader("Cache-Control", "s-maxage=86400");
  res.json(data);
}
