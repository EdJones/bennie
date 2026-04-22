export async function fetchCemdDistrict(state, districtName) {
  if (!state || !districtName) return null;
  try {
    const params = new URLSearchParams({ state, search: districtName });
    const res = await fetch(`/api/cemd?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.results?.[0] ?? null;
  } catch {
    return null;
  }
}
