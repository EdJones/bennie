<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";

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

const router = useRouter();
const route = useRoute();
const { user, isAdmin } = useAuth();
const schools = ref([]);
const loading = ref(true);
const selectedState = ref(route.query.state || "");
const showDropdown = ref(false);
const dropdownRef = ref(null);

watch(selectedState, (val) => {
  router.replace({ query: val ? { state: val } : {} });
});

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
  const list = selectedState.value
    ? schools.value.filter((s) => s.state === selectedState.value)
    : [];
  return [...list].sort((a, b) => {
    const distA = a.districtName ?? "";
    const distB = b.districtName ?? "";
    if (distA !== distB) return distA.localeCompare(distB);
    const nameA = a.level === "district" ? "" : (a.schoolName ?? "");
    const nameB = b.level === "district" ? "" : (b.schoolName ?? "");
    return nameA.localeCompare(nameB);
  });
});

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

        <div class="state-dropdown" ref="dropdownRef">
          <button
            class="dropdown-trigger"
            :class="{ open: showDropdown, active: selectedState }"
            @click="showDropdown = !showDropdown"
          >
            <span v-if="selectedState" class="trigger-label">{{ stateLabel(selectedState) }}</span>
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

        <div v-if="!selectedState" class="empty">Select a state above to view records.</div>

        <table v-else class="schools-table">
          <thead>
            <tr>
              <th>State</th>
              <th>District</th>
              <th>School</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="school in filteredSchools" :key="school.id">
              <td>{{ school.state }}</td>
              <td>{{ school.districtName }}</td>
              <td>
                {{ school.level === "district" ? school.districtName : school.schoolName }}
                <span v-if="school.level === 'district'" class="level-badge">District</span>
              </td>
              <td class="actions">
                <button class="btn-view" @click="router.push(`/view/${school.id}`)">View</button>
                <button class="btn-edit" @click="router.push(`/edit/${school.id}`)">Edit</button>
                <button v-if="isAdmin" class="btn-delete" @click="deleteSchool(school.id)">
                  Delete
                </button>
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

.state-dropdown {
  position: relative;
  width: 280px;
  margin-bottom: 1.5rem;
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

tr:hover {
  background-color: #f8f9fa;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.btn-view,
.btn-edit,
.btn-delete {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
}

.btn-view {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.btn-view:hover {
  background-color: #c8e6c9;
}

.btn-edit {
  background-color: #e8f4f8;
  color: #4a90a4;
}

.btn-edit:hover {
  background-color: #d0e8f0;
}

.btn-delete {
  background-color: #fee;
  color: #c44;
}

.btn-delete:hover {
  background-color: #fdd;
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
</style>
