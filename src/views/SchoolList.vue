<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import CurriculumSummary from "../components/CurriculumSummary.vue";
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
import { db } from "../firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "../composables/useAuth";
import { logSchoolDelete } from "../services/activityLog";
import { getSchoolCountForDistricts } from "../services/nces";
import { getProgramForProduct } from "../data/curriculumCategories";

const CORE_CATEGORIES = new Set([
  "Balanced Literacy",
  "Basals",
  "Book-Centered & Knowledge-Building",
]);

function getCoreCurricula(school) {
  const seen = new Set();
  const results = [];
  for (const entry of school.elaCurricula ?? []) {
    const product = entry?.product?.trim();
    if (!product) continue;
    if (entry?.reportedMaterialType === "Reading Intervention") continue;
    const match = getProgramForProduct(product);
    if (match && CORE_CATEGORIES.has(match.categoryName) && !seen.has(match.programName)) {
      seen.add(match.programName);
      results.push(match.programName);
    }
  }
  return results;
}

function getFoundationalCurricula(school) {
  const seen = new Set();
  const results = [];
  for (const entry of school.elaCurricula ?? []) {
    const product = entry?.product?.trim();
    if (!product) continue;
    if (entry?.reportedMaterialType === "Reading Intervention") continue;
    const match = getProgramForProduct(product);
    if (match && match.categoryName === "Foundational / Phonics" && !seen.has(match.programName)) {
      seen.add(match.programName);
      results.push(match.programName);
    }
  }
  return results;
}

const router = useRouter();
const route = useRoute();
const { user, isAdmin } = useAuth();
const schools = ref([]);
const loading = ref(true);
const selectedState = ref(route.query.state || "");
const showDropdown = ref(false);
const dropdownRef = ref(null);
const searchQuery = ref("");
const selectedCurriculum = ref("");
const selectedIntervention = ref("");
const activeTab = ref("core");

const INTERVENTION_MATERIAL_TYPES = new Set([
  "Reading Intervention",
  "Both ELA Core and Reading Intervention",
]);

function getSchoolInterventionProducts(school) {
  const fromField = school.interventionProducts ?? [];
  const fromCurricula = (school.elaCurricula ?? [])
    .filter((e) => INTERVENTION_MATERIAL_TYPES.has(e?.reportedMaterialType))
    .map((e) => e?.product?.trim())
    .filter(Boolean);
  return [...new Set([...fromField, ...fromCurricula])];
}

function getCurriculumLabel(school) {
  const first = school.elaCurricula?.[0];
  return first?.product ?? first?.provider ?? "";
}

const usedInterventionProducts = computed(() => {
  const source = selectedState.value
    ? schools.value.filter((s) => s.state === selectedState.value)
    : schools.value;
  const products = new Set();
  for (const school of source) {
    for (const p of getSchoolInterventionProducts(school)) {
      products.add(p);
    }
  }
  return [...products].sort();
});

const uniqueCurriculumProducts = computed(() => {
  const products = new Set();
  for (const school of schools.value) {
    for (const c of school.elaCurricula ?? []) {
      if (c.product) products.add(c.product);
    }
  }
  return [...products].sort();
});

watch(selectedState, (val) => {
  router.replace({ query: val ? { state: val } : {} });
  searchQuery.value = "";
});

function switchTab(tab) {
  activeTab.value = tab;
  selectedCurriculum.value = "";
  selectedIntervention.value = "";
  searchQuery.value = "";
}

function stateLabel(abbr) {
  return STATE_NAMES[abbr] ?? abbr;
}

function selectState(state) {
  selectedState.value = state;
  showDropdown.value = false;
}

function handleOutsideClick(e) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    showDropdown.value = false;
  }
}

const uniqueStates = computed(() =>
  [...new Set(schools.value.map((s) => s.state).filter(Boolean))].sort(),
);

const stateSummary = computed(() =>
  uniqueStates.value.map((state) => {
    const group = schools.value.filter((s) => s.state === state);
    return {
      state,
      total: group.length,
      districts: group.filter((s) => s.level === "district").length,
      schools: group.filter((s) => s.level === "school").length,
    };
  }),
);

const totalDistricts = computed(() => schools.value.filter((s) => s.level === "district").length);
const totalSchools = computed(() => schools.value.filter((s) => s.level === "school").length);
const districtSchoolCount = ref(null);

const filteredSchools = computed(() => {
  if (!selectedState.value && !selectedCurriculum.value && !selectedIntervention.value) return [];
  const q = searchQuery.value.trim().toLowerCase();
  const list = schools.value.filter((s) => {
    if (selectedState.value && s.state !== selectedState.value) return false;
    if (selectedCurriculum.value) {
      if (!s.elaCurricula?.some((c) => c.product === selectedCurriculum.value)) return false;
    }
    if (selectedIntervention.value) {
      if (!getSchoolInterventionProducts(s).includes(selectedIntervention.value)) return false;
    }
    if (activeTab.value === "intervention" && !selectedIntervention.value) {
      if (getSchoolInterventionProducts(s).length === 0) return false;
    }
    if (q)
      return s.districtName?.toLowerCase().includes(q) || s.schoolName?.toLowerCase().includes(q);
    return true;
  });
  return [...list].sort((a, b) => {
    const aIsDistrict = a.level === "district" ? 0 : 1;
    const bIsDistrict = b.level === "district" ? 0 : 1;
    if (aIsDistrict !== bIsDistrict) return aIsDistrict - bIsDistrict;
    const stateA = a.state ?? "",
      stateB = b.state ?? "";
    if (stateA !== stateB) return stateA.localeCompare(stateB);
    const distA = a.districtName ?? "",
      distB = b.districtName ?? "";
    if (distA !== distB) return distA.localeCompare(distB);
    const nameA = a.level === "district" ? "" : (a.schoolName ?? "");
    const nameB = b.level === "district" ? "" : (b.schoolName ?? "");
    return nameA.localeCompare(nameB);
  });
});

const filteredDistricts = computed(() =>
  filteredSchools.value.filter((s) => s.level === "district"),
);
const filteredNonDistricts = computed(() =>
  filteredSchools.value.filter((s) => s.level !== "district"),
);

async function fetchSchools() {
  loading.value = true;
  try {
    const querySnapshot = await getDocs(collection(db, "schools"));
    schools.value = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching schools:", error);
  }
  loading.value = false;

  const districtsByState = {};
  for (const s of schools.value.filter(
    (s) => s.level === "district" && s.districtName && s.state,
  )) {
    (districtsByState[s.state] ??= []).push(s.districtName);
  }
  getSchoolCountForDistricts(districtsByState).then((count) => {
    districtSchoolCount.value = count;
  });
}

async function deleteSchool(id) {
  if (!confirm("Are you sure you want to delete this entry?")) return;

  const school = schools.value.find((s) => s.id === id);
  try {
    await deleteDoc(doc(db, "schools", id));
    await logSchoolDelete(user.value, id, school);
    schools.value = schools.value.filter((s) => s.id !== id);
  } catch (error) {
    console.error("Error deleting:", error);
    alert("Error deleting entry");
  }
}

onMounted(() => {
  fetchSchools();
  document.addEventListener("click", handleOutsideClick);
});

onUnmounted(() => {
  document.removeEventListener("click", handleOutsideClick);
});
</script>

<template>
  <div class="list-container">
    <div class="list-section">
      <div class="header">
        <div class="header-left">
          <h1>Schools</h1>
          <button class="btn-primary" @click="router.push('/add')">+ Add New</button>
        </div>
        <img src="/bennie_large.png" alt="Bennie the school detective dog" class="bennie-large" />
      </div>

      <div v-if="loading" class="loading">Loading...</div>

      <template v-else>
        <div class="summary-section">
          <div class="summary-card">
            <div class="summary-value">{{ schools.length }}</div>
            <div class="summary-label">Total Records</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">{{ uniqueStates.length }}</div>
            <div class="summary-label">States</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">{{ totalDistricts }}</div>
            <div class="summary-label">Districts</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">
              {{
                districtSchoolCount !== null
                  ? "~" + districtSchoolCount.toLocaleString()
                  : totalSchools
              }}
            </div>
            <div class="summary-label">Schools</div>
          </div>
        </div>

        <div class="state-chips">
          <span v-for="s in stateSummary" :key="s.state" class="state-chip">
            {{ s.state }}: {{ s.total }}
          </span>
        </div>

        <div class="filters-row">
          <div class="state-dropdown" ref="dropdownRef">
            <button
              class="dropdown-trigger"
              :class="{ open: showDropdown, active: selectedState }"
              @click="showDropdown = !showDropdown"
            >
              <span v-if="selectedState" class="trigger-label">{{
                stateLabel(selectedState)
              }}</span>
              <span v-else class="trigger-placeholder">Select a state...</span>
              <span class="trigger-right">
                <button
                  v-if="selectedState"
                  class="clear-btn"
                  @click.stop="selectedState = ''"
                  aria-label="Clear selection"
                >
                  ×
                </button>
                <span class="chevron" :class="{ open: showDropdown }"></span>
              </span>
            </button>

            <div v-if="showDropdown" class="dropdown-panel">
              <button
                v-for="s in stateSummary"
                :key="s.state"
                class="dropdown-option"
                :class="{ selected: selectedState === s.state }"
                @click="selectState(s.state)"
              >
                <span class="option-name">{{ stateLabel(s.state) }}</span>
                <span class="option-count">{{ s.total.toLocaleString() }}</span>
              </button>
            </div>
          </div>
        </div>

        <template v-if="selectedState || selectedCurriculum || selectedIntervention">
          <div class="tab-bar">
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'core' }"
              @click="switchTab('core')"
            >
              Core / Foundational
            </button>
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'intervention' }"
              @click="switchTab('intervention')"
            >
              Intervention
            </button>
          </div>

          <div v-if="activeTab === 'core'" class="filters-row">
            <div class="curriculum-filter">
              <select v-model="selectedCurriculum" class="curriculum-select">
                <option value="">All curricula</option>
                <option v-for="p in uniqueCurriculumProducts" :key="p" :value="p">{{ p }}</option>
              </select>
              <button
                v-if="selectedCurriculum"
                class="clear-curriculum"
                @click="selectedCurriculum = ''"
              >
                ×
              </button>
            </div>
          </div>

          <div v-if="activeTab === 'intervention'" class="filters-row">
            <div class="curriculum-filter">
              <select v-model="selectedIntervention" class="curriculum-select">
                <option value="">All intervention products</option>
                <option v-for="p in usedInterventionProducts" :key="p" :value="p">{{ p }}</option>
              </select>
              <button
                v-if="selectedIntervention"
                class="clear-curriculum"
                @click="selectedIntervention = ''"
              >
                ×
              </button>
            </div>
          </div>
        </template>

        <CurriculumSummary
          v-if="!selectedState && !selectedCurriculum && !selectedIntervention"
          :schools="schools"
        />

        <div v-else class="search-row">
          <input
            v-model="searchQuery"
            class="search-input"
            type="search"
            placeholder="Search districts and schools..."
            autocomplete="off"
          />
          <span v-if="searchQuery" class="search-count">
            {{ filteredSchools.length }} result{{ filteredSchools.length === 1 ? "" : "s" }}
          </span>
        </div>

        <p
          v-if="selectedState === 'MA' && activeTab === 'intervention'"
          class="state-intervention-note"
        >
          Massachusetts DESE does not separately report reading intervention programs, so no data is
          available for this tab.
        </p>

        <table
          v-if="selectedState || selectedCurriculum || selectedIntervention"
          class="schools-table"
        >
          <thead>
            <tr>
              <th>State</th>
              <th>District</th>
              <th v-if="activeTab === 'core'">School</th>
              <th v-if="activeTab === 'core'">Core Curriculum</th>
              <th v-if="activeTab === 'core'">Foundational / Phonics</th>
              <th v-if="activeTab === 'intervention'">Interventions</th>
              <th v-if="isAdmin"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="school in filteredDistricts"
              :key="school.id"
              class="clickable-row"
              @click="router.push(`/view/${school.id}`)"
            >
              <td>{{ school.state }}</td>
              <td>{{ school.districtName }}</td>
              <td v-if="activeTab === 'core'">
                <span class="level-badge">District-Wide</span>
              </td>
              <td v-if="activeTab === 'core'" class="curriculum-cell">
                {{ getCoreCurricula(school).join(", ") }}
              </td>
              <td v-if="activeTab === 'core'" class="curriculum-cell foundational-cell">
                {{ getFoundationalCurricula(school).join(", ") }}
              </td>
              <td v-if="activeTab === 'intervention'" class="interventions-cell">
                <span
                  v-for="p in getSchoolInterventionProducts(school)"
                  :key="p"
                  class="intervention-tag"
                  :class="{ highlight: p === selectedIntervention }"
                  >{{ p }}</span
                >
              </td>
              <td v-if="isAdmin" class="actions">
                <button class="btn-delete" @click.stop="deleteSchool(school.id)">Delete</button>
              </td>
            </tr>

            <tr
              v-if="filteredDistricts.length && filteredNonDistricts.length"
              class="section-separator"
            >
              <td colspan="10">Individual Schools</td>
            </tr>

            <tr
              v-for="school in filteredNonDistricts"
              :key="school.id"
              class="clickable-row"
              @click="router.push(`/view/${school.id}`)"
            >
              <td>{{ school.state }}</td>
              <td>{{ school.districtName }}</td>
              <td v-if="activeTab === 'core'">{{ school.schoolName }}</td>
              <td v-if="activeTab === 'core'" class="curriculum-cell">
                {{ getCoreCurricula(school).join(", ") }}
              </td>
              <td v-if="activeTab === 'core'" class="curriculum-cell foundational-cell">
                {{ getFoundationalCurricula(school).join(", ") }}
              </td>
              <td v-if="activeTab === 'intervention'" class="interventions-cell">
                <span
                  v-for="p in getSchoolInterventionProducts(school)"
                  :key="p"
                  class="intervention-tag"
                  :class="{ highlight: p === selectedIntervention }"
                  >{{ p }}</span
                >
              </td>
              <td v-if="isAdmin" class="actions">
                <button class="btn-delete" @click.stop="deleteSchool(school.id)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </div>
  </div>
</template>

<style scoped>
.list-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.list-section {
  width: 100%;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 1.5rem;
  gap: 1.5rem;
  position: relative;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  align-self: flex-end;
}

.bennie-large {
  max-width: 400px;
  width: auto;
  height: auto;
  border-radius: 8px;
  flex-shrink: 0;
  margin-top: -2rem;
  align-self: flex-start;
}

@media (max-width: 768px) {
  .list-container {
    padding: 1rem;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .header-left {
    width: 100%;
    justify-content: space-between;
  }

  .bennie-large {
    max-width: 120px;
    align-self: flex-end;
    margin-top: 0;
  }

  .filters-row {
    flex-direction: column;
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .filters-or {
    margin: 0;
  }

  .state-dropdown,
  .curriculum-select {
    width: 100%;
    min-width: unset;
  }

  .schools-table {
    font-size: 0.875rem;
  }

  th,
  td {
    padding: 0.75rem 0.5rem;
  }

  .actions {
    flex-direction: column;
    gap: 0.25rem;
  }

  .summary-section {
    flex-direction: column;
  }

  .state-dropdown {
    width: 100%;
  }
}

h1 {
  color: #333;
  margin: 0;
}

.btn-primary {
  background-color: #4a90a4;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
}

.btn-primary:hover {
  background-color: #3a7a8a;
}

.loading,
.empty {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.summary-section {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.25rem;
}

.summary-card {
  flex: 1;
  background: white;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.15rem;
}

.summary-label {
  font-size: 0.7rem;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.state-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.state-chip {
  background: #e8f4f8;
  color: #4a90a4;
  border-radius: 4px;
  padding: 0.25rem 0.6rem;
  font-size: 0.8rem;
  font-weight: 500;
}

.filters-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.filters-or {
  font-size: 0.85rem;
  color: #999;
  align-self: center;
  white-space: nowrap;
}

.state-dropdown {
  position: relative;
  width: 280px;
}

.dropdown-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: white;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
  font-size: 0.95rem;
  cursor: pointer;
  color: #333;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07);
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
  text-align: left;
}

.dropdown-trigger:hover,
.dropdown-trigger.open {
  border-color: #4a90a4;
  box-shadow: 0 0 0 3px rgba(74, 144, 164, 0.12);
}

.trigger-placeholder {
  color: #aaa;
}

.trigger-right {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border: none;
  border-radius: 50%;
  background: #e0e0e0;
  color: #666;
  font-size: 0.9rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}

.clear-btn:hover {
  background: #ccc;
}

.chevron {
  display: inline-block;
  width: 0.45rem;
  height: 0.45rem;
  border-right: 2px solid #999;
  border-bottom: 2px solid #999;
  transform: rotate(45deg) translateY(-2px);
  transition: transform 0.15s ease;
}

.chevron.open {
  transform: rotate(-135deg) translateY(-2px);
}

.dropdown-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  z-index: 100;
}

.dropdown-option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 1rem;
  border: none;
  background: none;
  font-size: 0.9rem;
  cursor: pointer;
  text-align: left;
  color: #333;
  transition: background 0.1s;
}

.dropdown-option:hover {
  background: #f5f9fb;
}

.dropdown-option.selected {
  background: #e8f4f8;
  color: #4a90a4;
  font-weight: 500;
}

.option-count {
  font-size: 0.8rem;
  color: #aaa;
  font-weight: 400;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.search-input {
  flex: 1;
  max-width: 400px;
  padding: 0.6rem 0.9rem;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
  font-size: 0.95rem;
  background: white;
  color: #333;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07);
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.search-input:focus {
  outline: none;
  border-color: #4a90a4;
  box-shadow: 0 0 0 3px rgba(74, 144, 164, 0.12);
}

.search-count {
  font-size: 0.8rem;
  color: #aaa;
}

.state-intervention-note {
  margin: 0 0 1rem;
  padding: 1rem 1.25rem;
  font-size: 0.875rem;
  font-style: italic;
  color: #888;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.schools-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

th,
td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #555;
}

.clickable-row {
  cursor: pointer;
}

.clickable-row:hover {
  background-color: #f5f9fb;
}

.actions {
  text-align: right;
}

.btn-delete {
  padding: 0.3rem 0.7rem;
  border: none;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  background-color: #fee;
  color: #c44;
}

.btn-delete:hover {
  background-color: #fdd;
}

.tab-bar {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 1.25rem;
  border-bottom: 2px solid #e8e8e8;
}

.tab-btn {
  padding: 0.6rem 1.25rem;
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  font-size: 0.9rem;
  font-weight: 500;
  color: #888;
  cursor: pointer;
  margin-bottom: -2px;
  transition:
    color 0.15s,
    border-color 0.15s;
}

.tab-btn:hover {
  color: #444;
}

.tab-btn.active {
  color: #4a90a4;
  border-bottom-color: #4a90a4;
}

.curriculum-filter {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.curriculum-select {
  padding: 0.75rem 1rem;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
  font-size: 0.95rem;
  background: white;
  color: #333;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07);
  cursor: pointer;
  width: 280px;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.curriculum-select:focus {
  outline: none;
  border-color: #4a90a4;
  box-shadow: 0 0 0 3px rgba(74, 144, 164, 0.12);
}

.clear-curriculum {
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

.clear-curriculum:hover {
  background: #ccc;
}

.curriculum-cell {
  color: #555;
  font-size: 0.9rem;
}

.foundational-cell {
  color: #888;
}

.section-separator td {
  background: #f8f9fa;
  color: #999;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0.5rem 1rem;
  border-top: 2px solid #e8e8e8;
  cursor: default;
}

.level-badge {
  display: inline-block;
  margin-left: 0.4rem;
  padding: 0.1rem 0.4rem;
  background-color: #e8f4f8;
  color: #4a90a4;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 500;
  vertical-align: middle;
}

.interventions-cell {
  font-size: 0.85rem;
}

.intervention-tag {
  display: inline-block;
  margin: 0.1rem 0.2rem 0.1rem 0;
  padding: 0.15rem 0.45rem;
  background-color: #f0f4e8;
  color: #5a7a2e;
  border-radius: 3px;
  font-size: 0.75rem;
  white-space: nowrap;
}

.intervention-tag.highlight {
  background-color: #d4e8b0;
  color: #3a5a1a;
  font-weight: 600;
}
</style>
