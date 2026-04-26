<script setup>
import { ref, computed, onMounted } from "vue";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  curriculumCategories,
  homegrownCategory,
  getProgramForProduct,
} from "../data/curriculumCategories";

const STATE_NAMES = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "Washington D.C.",
};

const schools = ref([]);
const loading = ref(true);
const selectedState = ref("");

onMounted(async () => {
  try {
    const snapshot = await getDocs(collection(db, "schools"));
    schools.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("Error fetching schools:", e);
  }
  loading.value = false;
});

const uniqueStates = computed(() =>
  [...new Set(schools.value.map((s) => s.state).filter(Boolean))].sort(),
);

const filteredSchools = computed(() =>
  selectedState.value
    ? schools.value.filter((s) => s.state === selectedState.value)
    : schools.value,
);

function stateLabel(abbr) {
  return STATE_NAMES[abbr] ?? abbr;
}

function pct(count, total) {
  if (total === 0) return "—";
  return ((count / total) * 100).toFixed(1) + "%";
}

const tableData = computed(() => {
  const schoolList = filteredSchools.value;
  const total = schoolList.length;

  const programCounts = {};
  for (const school of schoolList) {
    const product = school.elaCurricula?.[0]?.product;
    const match = product ? getProgramForProduct(product) : null;
    const key = match
      ? `${match.categoryName}||${match.programName}`
      : product
        ? "__homegrown__"
        : "__no_data__";
    programCounts[key] = (programCounts[key] ?? 0) + 1;
  }

  const rows = [];

  for (const cat of curriculumCategories) {
    let catTotal = 0;
    const catRows = [];

    for (const prog of cat.programs) {
      const key = `${cat.name}||${prog.name}`;
      const count = programCounts[key] ?? 0;
      catTotal += count;
      catRows.push({ programName: prog.name, count });
    }

    catRows.forEach((row, i) => {
      rows.push({
        ...row,
        isFirstInCategory: i === 0,
        categoryRowspan: cat.programs.length,
        categoryName: cat.name,
        categoryColor: cat.color,
        categoryTextColor: cat.textColor,
        catTotal,
        shareOfAdoptions: pct(row.count, total),
        categoryShare: pct(catTotal, total),
      });
    });
  }

  const homegrownCount = programCounts["__homegrown__"] ?? 0;
  const noDataCount = programCounts["__no_data__"] ?? 0;
  const homegrownTotal = homegrownCount + noDataCount;
  rows.push({
    isFirstInCategory: true,
    categoryRowspan: 2,
    categoryName: homegrownCategory.name,
    categoryColor: homegrownCategory.color,
    categoryTextColor: homegrownCategory.textColor,
    catTotal: homegrownTotal,
    programName: "Supplemental Bundle",
    count: homegrownCount,
    shareOfAdoptions: pct(homegrownCount, total),
    categoryShare: pct(homegrownTotal, total),
  });
  rows.push({
    isFirstInCategory: false,
    categoryName: homegrownCategory.name,
    categoryColor: homegrownCategory.color,
    catTotal: homegrownTotal,
    programName: "No curriculum recorded",
    programNameMuted: true,
    count: noDataCount,
    shareOfAdoptions: pct(noDataCount, total),
    categoryShare: pct(homegrownTotal, total),
  });

  return { rows, total };
});

const unmatchedProducts = computed(() => {
  const counts = {};
  for (const school of filteredSchools.value) {
    const product = school.elaCurricula?.[0]?.product;
    if (product && !getProgramForProduct(product)) {
      counts[product] = (counts[product] ?? 0) + 1;
    }
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
});

const noDataByProvider = computed(() => {
  const counts = {};
  for (const school of filteredSchools.value) {
    const entry = school.elaCurricula?.[0];
    if (!entry?.product) {
      const key = entry?.provider || "(no provider)";
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
});

const hasHomegrownDetail = computed(
  () => unmatchedProducts.value.length > 0 || noDataByProvider.value.length > 0,
);
</script>

<template>
  <div class="summary-container">
    <div class="page-header">
      <h1>Curriculum Adoption Summary</h1>
      <p class="subtitle">
        Based on {{ tableData.total.toLocaleString() }} records
        <span v-if="selectedState"> in {{ stateLabel(selectedState) }}</span>
      </p>
    </div>

    <div class="filter-bar">
      <label class="filter-label">Filter by state</label>
      <div class="state-filter">
        <select v-model="selectedState" class="state-select">
          <option value="">All states</option>
          <option v-for="s in uniqueStates" :key="s" :value="s">
            {{ stateLabel(s) }}
          </option>
        </select>
        <button v-if="selectedState" class="clear-btn" @click="selectedState = ''">×</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading...</div>

    <table v-else class="summary-table">
      <thead>
        <tr>
          <th class="col-category">Category</th>
          <th class="col-program">Program</th>
          <th class="col-number">Schools</th>
          <th class="col-number">Share of Adoptions</th>
          <th class="col-number">Category Share</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in tableData.rows" :key="i">
          <td
            v-if="row.isFirstInCategory"
            :rowspan="row.categoryRowspan"
            :style="{ background: row.categoryColor, color: row.categoryTextColor }"
            class="category-cell"
          >
            {{ row.categoryName }}
          </td>
          <td class="program-cell" :class="{ muted: row.programNameMuted }">
            {{ row.programName }}
          </td>
          <td class="number-cell">{{ row.count > 0 ? row.count.toLocaleString() : "0" }}</td>
          <td class="number-cell">{{ row.shareOfAdoptions }}</td>
          <td
            v-if="row.isFirstInCategory"
            :rowspan="row.categoryRowspan"
            :style="{ background: row.categoryColor }"
            class="category-share-cell"
          >
            <strong>{{ row.categoryShare }}</strong>
          </td>
        </tr>
      </tbody>
    </table>

    <p class="footnote">
      Each record is assigned to a category based on its primary curriculum. Records without a
      recognized curriculum appear under Homegrown.
    </p>

    <details v-if="!loading && hasHomegrownDetail" class="homegrown-detail">
      <summary>What's in the Homegrown category?</summary>

      <div class="detail-sections">
        <div v-if="unmatchedProducts.length > 0" class="detail-section">
          <h3>Supplemental Bundle — unmatched product strings</h3>
          <table class="detail-table">
            <thead>
              <tr>
                <th>Product string</th>
                <th class="col-number">Records</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="[product, count] in unmatchedProducts" :key="product">
                <td>{{ product }}</td>
                <td class="number-cell">{{ count.toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="noDataByProvider.length > 0" class="detail-section">
          <h3>No curriculum recorded — breakdown by provider</h3>
          <table class="detail-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th class="col-number">Records</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="[provider, count] in noDataByProvider" :key="provider">
                <td :class="{ muted: provider === '(no provider)' }">{{ provider }}</td>
                <td class="number-cell">{{ count.toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </details>
  </div>
</template>

<style scoped>
.summary-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  margin-bottom: 1.5rem;
}

.page-header h1 {
  margin: 0 0 0.25rem;
  color: #333;
}

.subtitle {
  margin: 0;
  color: #888;
  font-size: 0.9rem;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.filter-label {
  font-size: 0.875rem;
  color: #666;
  white-space: nowrap;
}

.state-filter {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.state-select {
  padding: 0.6rem 1rem;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
  font-size: 0.95rem;
  background: white;
  color: #333;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07);
  cursor: pointer;
  min-width: 200px;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.state-select:focus {
  outline: none;
  border-color: #4a90a4;
  box-shadow: 0 0 0 3px rgba(74, 144, 164, 0.12);
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  border-radius: 50%;
  background: #e0e0e0;
  color: #666;
  font-size: 1rem;
  cursor: pointer;
  padding: 0;
}

.clear-btn:hover {
  background: #ccc;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.summary-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 1rem;
}

th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #555;
  padding: 0.85rem 1rem;
  border-bottom: 2px solid #e8e8e8;
  text-align: left;
}

th.col-number,
.number-cell,
.category-share-cell {
  text-align: right;
}

td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #eee;
  vertical-align: middle;
}

tr:last-child td {
  border-bottom: none;
}

.category-cell {
  font-weight: 600;
  font-size: 0.9rem;
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  vertical-align: middle;
}

.col-category {
  width: 180px;
}

.col-program {
  min-width: 200px;
}

.col-number {
  width: 140px;
}

.program-cell {
  color: #333;
  font-size: 0.9rem;
}

.program-cell.muted {
  color: #aaa;
  font-style: italic;
}

.number-cell {
  color: #555;
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
}

.category-share-cell {
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
  border-left: 1px solid rgba(0, 0, 0, 0.06);
  vertical-align: middle;
}

.footnote {
  font-size: 0.8rem;
  color: #aaa;
  margin: 0 0 1.5rem;
}

.homegrown-detail {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  background: white;
  padding: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07);
}

.homegrown-detail > summary {
  padding: 0.85rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #555;
  cursor: pointer;
  user-select: none;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.homegrown-detail > summary::before {
  content: "▶";
  font-size: 0.65rem;
  color: #aaa;
  transition: transform 0.15s;
}

.homegrown-detail[open] > summary::before {
  transform: rotate(90deg);
}

.detail-sections {
  padding: 0 1rem 1rem;
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.detail-section {
  flex: 1;
  min-width: 260px;
}

.detail-section h3 {
  font-size: 0.775rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #999;
  margin: 0 0 0.5rem;
  font-weight: 600;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.detail-table th {
  background: #f8f9fa;
  padding: 0.4rem 0.6rem;
  color: #666;
  font-weight: 600;
  border-bottom: 1px solid #e8e8e8;
  text-align: left;
}

.detail-table td {
  padding: 0.35rem 0.6rem;
  border-bottom: 1px solid #f0f0f0;
  color: #444;
}

.detail-table tr:last-child td {
  border-bottom: none;
}
</style>
