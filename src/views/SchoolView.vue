<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'

const route = useRoute()
const router = useRouter()
const school = ref(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const docRef = doc(db, 'schools', route.params.id)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      school.value = { id: docSnap.id, ...docSnap.data() }
    }
  } catch (error) {
    console.error('Error fetching school:', error)
  }
  loading.value = false
})

function formatBoolean(value) {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return '—'
}
</script>

<template>
  <div class="view-container">
    <div v-if="loading" class="loading">Loading...</div>

    <div v-else-if="!school" class="not-found">
      School not found.
      <button class="btn-secondary" @click="router.push('/')">Back to List</button>
    </div>

    <div v-else>
      <div class="header">
        <h1>{{ school.schoolName }}</h1>
        <div class="header-actions">
          <button class="btn-secondary" @click="router.push('/')">Back</button>
          <button class="btn-primary" @click="router.push(`/edit/${school.id}`)">Edit</button>
        </div>
      </div>

      <div class="info-card">
        <h2>Location</h2>
        <dl class="info-grid">
          <dt>State</dt>
          <dd>{{ school.state }}</dd>
          <dt>District</dt>
          <dd>{{ school.districtName }}</dd>
          <dt>School</dt>
          <dd>{{ school.schoolName }}</dd>
        </dl>
      </div>

      <div class="info-card">
        <h2>ELA Curriculum</h2>

        <h3>Foundations</h3>
        <dl class="info-grid">
          <dt>Same curriculum for foundations and rest of reading block?</dt>
          <dd>{{ formatBoolean(school.elaSameCurriculum) }}</dd>
          <template v-if="school.elaSameCurriculum === false">
            <dt>Provider</dt>
            <dd>{{ school.foundationsProvider || '—' }}</dd>
            <dt>Product</dt>
            <dd>{{ school.foundationsProduct || '—' }}</dd>
            <dt>Publication Year</dt>
            <dd>{{ school.foundationsYear || '—' }}</dd>
          </template>
        </dl>

        <h3>General/Comprehensive ELA</h3>
        <dl class="info-grid">
          <dt>Provider</dt>
          <dd>{{ school.generalElaProvider || '—' }}</dd>
          <dt>Product</dt>
          <dd>{{ school.generalElaProduct || '—' }}</dd>
          <dt>Publication Year</dt>
          <dd>{{ school.generalElaYear || '—' }}</dd>
        </dl>
      </div>

      <div class="info-card">
        <h2>Training & Implementation</h2>
        <dl class="info-grid">
          <dt>Teachers trained on general ELA curriculum?</dt>
          <dd>{{ formatBoolean(school.trainingGeneralEla) }}</dd>
          <dt>Year ELA curriculum first implemented</dt>
          <dd>{{ school.elaImplementationYear || '—' }}</dd>
          <dt>Teachers received Science of Reading training?</dt>
          <dd>{{ formatBoolean(school.trainingScienceOfReading) }}</dd>
          <template v-if="school.trainingScienceOfReading === true">
            <dt>Training Program</dt>
            <dd>{{ school.sorTrainingProgram || '—' }}</dd>
          </template>
        </dl>
      </div>

      <div class="info-card">
        <h2>Progress Monitoring & Diagnostic Assessments</h2>

        <h3>Progress Monitoring</h3>
        <dl class="info-grid">
          <dt>Uses progress monitoring tools?</dt>
          <dd>{{ formatBoolean(school.usesProgressMonitoring) }}</dd>
          <template v-if="school.usesProgressMonitoring === true">
            <template v-if="school.progressMonitoringTools?.length">
              <dt>Progress Monitoring Tools</dt>
              <dd>
                <ul class="product-list">
                  <li v-for="tool in school.progressMonitoringTools" :key="tool">{{ tool }}</li>
                </ul>
              </dd>
            </template>
            <dt>Assessment Frequency</dt>
            <dd>{{ school.progressMonitoringFrequency || '—' }}</dd>
          </template>
        </dl>

        <h3>Diagnostic Assessments</h3>
        <dl class="info-grid">
          <dt>Uses diagnostic assessments?</dt>
          <dd>{{ formatBoolean(school.usesDiagnosticAssessments) }}</dd>
          <template v-if="school.usesDiagnosticAssessments === true">
            <template v-if="school.diagnosticAssessmentTools?.length">
              <dt>Diagnostic Assessment Tools</dt>
              <dd>
                <ul class="product-list">
                  <li v-for="tool in school.diagnosticAssessmentTools" :key="tool">{{ tool }}</li>
                </ul>
              </dd>
            </template>
            <dt>Assessment Frequency</dt>
            <dd>{{ school.diagnosticAssessmentFrequency || '—' }}</dd>
          </template>
        </dl>
      </div>

      <div v-if="school.additionalProducts !== null" class="info-card">
        <h2>Additional Products</h2>
        <dl class="info-grid">
          <dt>Uses additional literacy products?</dt>
          <dd>{{ formatBoolean(school.additionalProducts) }}</dd>
          <template v-if="school.additionalProducts === true && school.additionalProductTypes?.length">
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
    </div>
  </div>
</template>

<style scoped>
.view-container {
  max-width: 700px;
  margin: 0 auto;
  padding: 2rem;
}

.loading, .not-found {
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

.btn-primary, .btn-secondary {
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

.info-card h2 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.1rem;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 0.5rem;
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
</style>
