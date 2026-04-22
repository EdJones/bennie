<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { fetchCemdDistrict } from "../services/cemd";

const route = useRoute();
const router = useRouter();
const school = ref(null);
const loading = ref(true);
const cemdDistrict = ref(null);

onMounted(async () => {
  try {
    const docRef = doc(db, "schools", route.params.id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      school.value = { id: docSnap.id, ...docSnap.data() };
      fetchCemdDistrict(school.value.state, school.value.districtName).then((d) => {
        cemdDistrict.value = d;
      });
    }
  } catch (error) {
    console.error("Error fetching school:", error);
  }
  loading.value = false;
});

function formatBoolean(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}
</script>

<template>
  <div class="view-container">
    <div v-if="loading" class="loading">Loading...</div>

    <div v-else-if="!school" class="not-found">
      School not found.
      <button class="btn-secondary" @click="router.back()">Back to List</button>
    </div>

    <div v-else>
      <div class="header">
        <h1>{{ school.level === "district" ? school.districtName : school.schoolName }}</h1>
        <div class="header-actions">
          <button class="btn-secondary" @click="router.back()">Back</button>
          <button class="btn-primary" @click="router.push(`/edit/${school.id}`)">Edit</button>
        </div>
      </div>

      <div class="info-card primary">
        <h2>ELA Curriculum</h2>
        <div v-if="!school.elaCurricula?.length" class="empty-state">
          No curriculum data on record.
        </div>
        <div v-else class="curriculum-entries">
          <div v-for="(entry, index) in school.elaCurricula" :key="index" class="curriculum-entry">
            <div class="curriculum-name">{{ entry.product || entry.provider || "—" }}</div>
            <div v-if="entry.product && entry.provider" class="curriculum-byline">
              {{ entry.provider }}
            </div>
            <div class="chip-group">
              <span v-if="entry.gradeRange" class="chip chip-meta">{{ entry.gradeRange }}</span>
              <span v-if="entry.year" class="chip chip-meta">{{ entry.year }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="info-card primary">
        <h2>Screening & Assessment</h2>

        <div class="asset-row">
          <div class="asset-label">Progress Monitoring</div>
          <div class="asset-value">
            <span v-if="school.usesProgressMonitoring === false" class="chip chip-no">None</span>
            <template v-else-if="school.progressMonitoringTools?.length">
              <div class="chip-group">
                <span
                  v-for="tool in school.progressMonitoringTools"
                  :key="tool"
                  class="chip chip-tool"
                  >{{ tool }}</span
                >
              </div>
              <div v-if="school.progressMonitoringFrequency" class="asset-frequency">
                {{ school.progressMonitoringFrequency }}
              </div>
            </template>
            <span v-else class="chip chip-meta">—</span>
          </div>
        </div>

        <div class="asset-row">
          <div class="asset-label">Diagnostic Assessments</div>
          <div class="asset-value">
            <span v-if="school.usesDiagnosticAssessments === false" class="chip chip-no">None</span>
            <template v-else-if="school.diagnosticAssessmentTools?.length">
              <div class="chip-group">
                <span
                  v-for="tool in school.diagnosticAssessmentTools"
                  :key="tool"
                  class="chip chip-tool"
                  >{{ tool }}</span
                >
              </div>
              <div v-if="school.diagnosticAssessmentFrequency" class="asset-frequency">
                {{ school.diagnosticAssessmentFrequency }}
              </div>
            </template>
            <span v-else class="chip chip-meta">—</span>
          </div>
        </div>
      </div>

      <div class="info-card primary">
        <h2>Training & Implementation</h2>

        <div class="asset-row">
          <div class="asset-label">ELA Curriculum Training</div>
          <div class="asset-value">
            <span
              class="chip"
              :class="
                school.trainingGeneralEla === true
                  ? 'chip-yes'
                  : school.trainingGeneralEla === false
                    ? 'chip-no'
                    : 'chip-meta'
              "
              >{{ formatBoolean(school.trainingGeneralEla) }}</span
            >
          </div>
        </div>

        <div class="asset-row">
          <div class="asset-label">Science of Reading Training</div>
          <div class="asset-value">
            <span
              class="chip"
              :class="
                school.trainingScienceOfReading === true
                  ? 'chip-yes'
                  : school.trainingScienceOfReading === false
                    ? 'chip-no'
                    : 'chip-meta'
              "
              >{{ formatBoolean(school.trainingScienceOfReading) }}</span
            >
            <span
              v-if="school.trainingScienceOfReading === true && school.sorTrainingProgram"
              class="chip chip-tool"
              >{{ school.sorTrainingProgram }}</span
            >
          </div>
        </div>

        <div v-if="school.elaImplementationYear" class="asset-row">
          <div class="asset-label">Implementation Year</div>
          <div class="asset-value">
            <span class="chip chip-meta">{{ school.elaImplementationYear }}</span>
          </div>
        </div>
      </div>

      <div v-if="school.additionalProducts !== null" class="info-card">
        <h2>Additional Products</h2>
        <dl class="info-grid">
          <dt>Uses additional literacy products?</dt>
          <dd>{{ formatBoolean(school.additionalProducts) }}</dd>
          <template
            v-if="school.additionalProducts === true && school.additionalProductTypes?.length"
          >
            <dt>Product Types</dt>
            <dd>
              <ul class="product-list">
                <li v-for="type in school.additionalProductTypes" :key="type">{{ type }}</li>
              </ul>
            </dd>
          </template>
        </dl>
      </div>

      <div v-if="school.additionalInformation" class="info-card">
        <h2>Additional Information</h2>
        <p class="additional-info-text">{{ school.additionalInformation }}</p>
      </div>

      <div class="info-card context">
        <h2>Location</h2>
        <dl class="info-grid">
          <dt>State</dt>
          <dd>{{ school.state }}</dd>
          <dt>District</dt>
          <dd>{{ school.districtName }}</dd>
          <dt>Level</dt>
          <dd>{{ school.level === "district" ? "District" : "School" }}</dd>
          <template v-if="school.level !== 'district'">
            <dt>School</dt>
            <dd>{{ school.schoolName || "—" }}</dd>
          </template>
        </dl>
      </div>

      <div
        v-if="school.mcaReadingPct != null || school.spedPct != null || school.enrollment"
        class="info-card context"
      >
        <h2>Minnesota Profile <span class="source-tag">via MN Reads Database</span></h2>
        <dl class="info-grid">
          <template v-if="school.charter != null">
            <dt>Charter School</dt>
            <dd>{{ school.charter ? "Yes" : "No" }}</dd>
          </template>
          <template v-if="school.districtNumber">
            <dt>District #</dt>
            <dd>{{ school.districtNumber }}</dd>
          </template>
          <template v-if="school.enrollment">
            <dt>Enrollment</dt>
            <dd>{{ school.enrollment }}</dd>
          </template>
          <template v-if="school.spedPct != null">
            <dt>Special Ed</dt>
            <dd>{{ school.spedPct }}%</dd>
          </template>
          <template v-if="school.frlPct != null">
            <dt>Free &amp; Reduced Lunch</dt>
            <dd>{{ school.frlPct }}%</dd>
          </template>
          <template v-if="school.mcaReadingPct != null">
            <dt>MCA Reading Proficiency</dt>
            <dd>{{ school.mcaReadingPct }}%</dd>
          </template>
          <template v-if="school.mcaFrlPct != null">
            <dt>MCA Reading (F&amp;R students)</dt>
            <dd>{{ school.mcaFrlPct }}%</dd>
          </template>
        </dl>
        <template v-if="school.tier2Materials">
          <h3>Tier 2 Intervention Materials</h3>
          <p class="additional-info-text">{{ school.tier2Materials }}</p>
        </template>
        <template v-if="school.screeningMeasures">
          <h3>Screening Measures</h3>
          <p class="additional-info-text">{{ school.screeningMeasures }}</p>
        </template>
        <template v-if="school.progressMonitoringMeasures">
          <h3>Progress Monitoring Measures</h3>
          <p class="additional-info-text">{{ school.progressMonitoringMeasures }}</p>
        </template>
      </div>

      <div v-if="cemdDistrict" class="info-card context">
        <h2>District Context <span class="source-tag">via CEMD</span></h2>
        <dl class="info-grid">
          <dt>Students</dt>
          <dd>{{ cemdDistrict.students_count?.toLocaleString() ?? "—" }}</dd>
          <dt>Schools</dt>
          <dd>{{ cemdDistrict.schools_count ?? "—" }}</dd>
          <dt>Locality</dt>
          <dd>{{ cemdDistrict.locality ?? "—" }}</dd>
          <dt>Free/Reduced Lunch</dt>
          <dd>{{ cemdDistrict.students_frl_pct ? cemdDistrict.students_frl_pct + "%" : "—" }}</dd>
          <dt>English Language Learners</dt>
          <dd>{{ cemdDistrict.students_ell_pct ? cemdDistrict.students_ell_pct + "%" : "—" }}</dd>
          <dt>Per-Pupil Spending</dt>
          <dd>
            {{
              cemdDistrict.finance_spend_per_pupil
                ? "$" + cemdDistrict.finance_spend_per_pupil.toLocaleString()
                : "—"
            }}
          </dd>
        </dl>
        <a
          v-if="cemdDistrict.stanford_data?.[0]?.stanford_link"
          :href="cemdDistrict.stanford_data[0].stanford_link"
          target="_blank"
          rel="noopener"
          class="stanford-link"
          >Stanford Education Data Archive →</a
        >
      </div>
    </div>
  </div>
</template>

<style scoped>
.view-container {
  max-width: 700px;
  margin: 0 auto;
  padding: 2rem;
}

.loading,
.not-found {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.not-found {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.header h1 {
  margin: 0;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
}

.btn-primary {
  background-color: #4a90a4;
  color: white;
}

.btn-primary:hover {
  background-color: #3a7a8a;
}

.btn-secondary {
  background-color: #e0e0e0;
  color: #333;
}

.btn-secondary:hover {
  background-color: #d0d0d0;
}

.info-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.info-card.context {
  box-shadow: none;
  border: 1px solid #e8e8e8;
}

.info-card h2 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.1rem;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 0.5rem;
}

.info-card.primary {
  border: 1px solid #b8d8e4;
}

.info-card.primary h2 {
  color: #4a90a4;
  border-bottom-color: #b8d8e4;
}

.info-card h3 {
  margin: 1.25rem 0 0.75rem 0;
  color: #555;
  font-size: 0.95rem;
}

.info-card h3:first-of-type {
  margin-top: 0;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem 1rem;
  margin: 0;
}

.info-grid dt {
  color: #666;
  font-size: 0.875rem;
}

.info-grid dd {
  margin: 0;
  color: #333;
  font-weight: 500;
}

.product-list {
  margin: 0;
  padding-left: 1.25rem;
}

.product-list li {
  margin-bottom: 0.25rem;
}

.additional-info-text {
  margin: 0;
  color: #333;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.source-tag {
  font-size: 0.75rem;
  font-weight: 400;
  color: #888;
  margin-left: 0.4rem;
}

.stanford-link {
  display: inline-block;
  margin-top: 1rem;
  font-size: 0.85rem;
  color: #4a90a4;
  text-decoration: none;
}

.stanford-link:hover {
  text-decoration: underline;
}

.empty-state {
  color: #888;
  font-size: 0.9rem;
}

/* Chip system */
.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1;
}

.chip-tool {
  background: #e8f4f8;
  color: #4a90a4;
}

.chip-meta {
  background: #f0f0f0;
  color: #666;
}

.chip-yes {
  background: #e8f5e9;
  color: #2e7d32;
}

.chip-no {
  background: #f5f5f5;
  color: #aaa;
}

/* Curriculum entries */
.curriculum-entries {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.curriculum-entry {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.curriculum-name {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.curriculum-byline {
  font-size: 0.8rem;
  color: #999;
}

/* Asset rows (screening, training) */
.asset-row {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.asset-row:first-of-type {
  padding-top: 0;
}

.asset-row:last-of-type {
  border-bottom: none;
  padding-bottom: 0;
}

.asset-label {
  width: 11rem;
  flex-shrink: 0;
  font-size: 0.75rem;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding-top: 0.3rem;
}

.asset-value {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
}

.asset-frequency {
  width: 100%;
  font-size: 0.75rem;
  color: #aaa;
  margin-top: 0.1rem;
}

.curricula-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.curricula-table th,
.curricula-table td {
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #eee;
}

.curricula-table th {
  color: #666;
  font-weight: 600;
  background-color: #f8f9fa;
}

.curricula-table td {
  color: #333;
}

.curricula-table tr:last-child td {
  border-bottom: none;
}
</style>
