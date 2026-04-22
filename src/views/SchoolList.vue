<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { db } from "../firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "../composables/useAuth";
import { logSchoolDelete } from "../services/activityLog";

const router = useRouter();
const route = useRoute();
const { user, isAdmin } = useAuth();
const schools = ref([]);
const loading = ref(true);
const selectedState = ref(route.query.state || "");

watch(selectedState, (val) => {
  router.replace({ query: val ? { state: val } : {} });
});

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

onMounted(fetchSchools);
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
            <div class="summary-value">{{ totalSchools }}</div>
            <div class="summary-label">Schools</div>
          </div>
        </div>

        <div class="state-chips">
          <span v-for="s in stateSummary" :key="s.state" class="state-chip">
            {{ s.state }}: {{ s.total }}
          </span>
        </div>

        <div class="filter-row">
          <select v-model="selectedState" class="state-select">
            <option value="">Select a state...</option>
            <option v-for="state in uniqueStates" :key="state" :value="state">
              {{ state }}
            </option>
          </select>
          <button v-if="selectedState" class="btn-clear" @click="selectedState = ''">Clear</button>
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

  .state-select {
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
  padding: 1.25rem 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.summary-value {
  font-size: 2rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.25rem;
}

.summary-label {
  font-size: 0.8rem;
  color: #666;
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

.filter-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.state-select {
  padding: 0.6rem 0.9rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  background: white;
  color: #333;
  cursor: pointer;
  min-width: 200px;
}

.state-select:focus {
  outline: 2px solid #4a90a4;
  outline-offset: 1px;
}

.btn-clear {
  padding: 0.6rem 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  color: #666;
  font-size: 0.875rem;
  cursor: pointer;
}

.btn-clear:hover {
  background: #f0f0f0;
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
