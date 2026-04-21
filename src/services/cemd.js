const BASE_URL = "https://api.cemd.org";

export async function fetchCemdDistrict(state, districtName) {
  if (!state || !districtName) return null;
  try {
    const params = new URLSearchParams({ state, search: districtName, limit: 1 });
    const res = await fetch(`${BASE_URL}/districts?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.results?.[0] ?? null;
  } catch {
    return null;
  }
}
