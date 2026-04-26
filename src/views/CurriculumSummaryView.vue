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
    const key = match ? `${match.categoryName}||${match.programName}` : "__homegrown__";
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
  rows.push({
    isFirstInCategory: true,
    categoryRowspan: 1,
    categoryName: homegrownCategory.name,
    categoryColor: homegrownCategory.color,
    categoryTextColor: homegrownCategory.textColor,
    catTotal: homegrownCount,
    programName: '"Supplemental Bundle"',
    count: homegrownCount,
    shareOfAdoptions: pct(homegrownCount, total),
    categoryShare: pct(homegrownCount, total),
  });

  return { rows, total };
});
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
          <td class="program-cell">{{ row.programName }}</td>
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
  margin: 0;
}
</style>
