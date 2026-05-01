<script setup>
import { ref, computed, onMounted } from "vue";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import CurriculumSummary from "../components/CurriculumSummary.vue";
import { STATE_NAMES } from "../data/stateNames";

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
</script>

<template>
  <div class="summary-container">
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
    <CurriculumSummary
      v-else
      :schools="filteredSchools"
      :state-label="selectedState ? stateLabel(selectedState) : ''"
    />
  </div>
</template>

<style scoped>
.summary-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
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
</style>
