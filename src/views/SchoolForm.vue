<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../firebase'
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore'
import { getStates, getDistricts, getSchools } from '../services/nces'
import { getProviderNames, getProductsForProvider } from '../data/providers'

const route = useRoute()
const router = useRouter()

const form = ref({
  state: '',
  districtId: '',
  districtName: '',
  schoolId: '',
  schoolName: '',
  elaSameCurriculum: null,
  foundationsProvider: '',
  foundationsProduct: '',
  foundationsYear: '',
  generalElaProvider: '',
  generalElaProduct: '',
  generalElaYear: '',
  trainingGeneralEla: null,
  elaImplementationYear: '',
  trainingScienceOfReading: null,
  sorTrainingProgram: '',
  additionalProducts: null,
  additionalProductTypes: []
})

const states = ref([])
const districts = ref([])
const schools = ref([])
const providers = getProviderNames()
const availableFoundationsProducts = computed(() => getProductsForProvider(form.value.foundationsProvider))
const availableGeneralElaProducts = computed(() => getProductsForProvider(form.value.generalElaProvider))

const trainingPrograms = [
  '95% Group',
  'Academic Language Therapy Associates (ALTA)',
  'AIM Institute for Learning and Research',
  'ALLMemphis',
  'Ashlock Consulting, Inc.',
  'Atlanta Speech School: Rollins Center for Language and Literacy',
  'Bowman Educational Services',
  'Brainspring',
  'Chartwell Teaching Institution',
  'Classmates Educational Group, Inc.',
  'Consortium of Reading Excellence (CORE)',
  'DC Reading Clinic',
  'Dyslexia Association of Singapore (DAS) Academy',
  'Dyslexia Training Institute',
  'Edwards Orton-Gillingham, Inc.',
  'Glean Education',
  'Hamilton County Educational Service Center',
  'Institute for Multisensory Education (IMSE)',
  'International Multisensory Structured Language Education Council (IMSLEC)',
  'Jemicy w/ Notre Dame of Maryland University',
  'Keys to Literacy',
  'Landmark Outreach',
  'Learning MATTERS, Ltd.',
  'LETRS',
  'Lexercise / MindInformation Inc.',
  'Lexia',
  'Literacy How',
  'LitLife, Inc.',
  'Maharashtra Dyslexia Association',
  'MaxScholar LLC',
  'May Center for Learning',
  'Mayerson Academy',
  'Memphis Literacy Institute',
  'MGT Impact Solutions',
  'National Institute for Learning Development (NILD)',
  'Neuhaus Education Center',
  'North Carolina Department of Public Instruction',
  'Orton-Gillingham Academy',
  'Orton-Gillingham International – Yoshimoto',
  'Public Consulting Group',
  'R.E.A.D. Redefined',
  'Reading and Language Learning Center',
  'Reed Charitable Foundation',
  'Region 4 Education Service Center',
  'Savannah Dyslexia',
  'The Apple Group for Dyslexia',
  'Valley Speech Language and Learning Center',
  'Wilson Reading System (WRS)',
  'Other'
]

const loading = ref(false)
const loadingStates = ref(false)
const loadingDistricts = ref(false)
const loadingSchools = ref(false)
const isEdit = ref(false)
const saveSuccess = ref(false)
const savedDocId = ref(null)

const additionalProductTypeOptions = [
  'Assessment/screening tools',
  'Intervention programs',
  'Decodable readers',
  'Supplemental phonics materials',
  'Vocabulary programs',
  'Writing programs',
  'Digital/technology tools',
  'Other'
]

onMounted(async () => {
  loadingStates.value = true
  try {
    states.value = await getStates()
  } catch (error) {
    console.error('Error loading states:', error)
  }
  loadingStates.value = false

  if (route.params.id) {
    isEdit.value = true
    loading.value = true
    const docRef = doc(db, 'schools', route.params.id)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const data = docSnap.data()
      form.value = data

      // Load districts and schools for editing
      if (data.state) {
        districts.value = await getDistricts(data.state)
      }
      if (data.districtId) {
        schools.value = await getSchools(data.districtId)
      }
    }
    loading.value = false
  }
})

watch(() => form.value.state, async (newState) => {
  if (!newState) {
    districts.value = []
    schools.value = []
    return
  }

  // Reset dependent fields
  form.value.districtId = ''
  form.value.districtName = ''
  form.value.schoolId = ''
  form.value.schoolName = ''
  schools.value = []

  loadingDistricts.value = true
  try {
    districts.value = await getDistricts(newState)
  } catch (error) {
    console.error('Error loading districts:', error)
  }
  loadingDistricts.value = false
})

watch(() => form.value.districtId, async (newDistrictId) => {
  if (!newDistrictId) {
    schools.value = []
    return
  }

  // Set district name
  const district = districts.value.find(d => d.LEAID === newDistrictId)
  form.value.districtName = district?.LEA_NAME || ''

  // Reset school
  form.value.schoolId = ''
  form.value.schoolName = ''

  loadingSchools.value = true
  try {
    schools.value = await getSchools(newDistrictId)
  } catch (error) {
    console.error('Error loading schools:', error)
  }
  loadingSchools.value = false
})

watch(() => form.value.schoolId, (newSchoolId) => {
  if (!newSchoolId) return
  const school = schools.value.find(s => s.NCESSCH === newSchoolId)
  form.value.schoolName = school?.SCH_NAME || ''
})

watch(() => form.value.foundationsProvider, () => {
  form.value.foundationsProduct = ''
})

watch(() => form.value.generalElaProvider, () => {
  form.value.generalElaProduct = ''
})

async function handleSubmit() {
  loading.value = true
  try {
    const dataToSave = {
      state: form.value.state,
      districtId: form.value.districtId,
      districtName: form.value.districtName,
      schoolId: form.value.schoolId,
      schoolName: form.value.schoolName,
      elaSameCurriculum: form.value.elaSameCurriculum,
      foundationsProvider: form.value.elaSameCurriculum === false ? form.value.foundationsProvider : null,
      foundationsProduct: form.value.elaSameCurriculum === false ? form.value.foundationsProduct : null,
      foundationsYear: form.value.elaSameCurriculum === false ? form.value.foundationsYear : null,
      generalElaProvider: form.value.generalElaProvider || null,
      generalElaProduct: form.value.generalElaProduct || null,
      generalElaYear: form.value.generalElaYear || null,
      trainingGeneralEla: form.value.trainingGeneralEla,
      elaImplementationYear: form.value.elaImplementationYear || null,
      trainingScienceOfReading: form.value.trainingScienceOfReading,
      sorTrainingProgram: form.value.trainingScienceOfReading === true ? form.value.sorTrainingProgram : null
    }

    if (isEdit.value) {
      const docRef = doc(db, 'schools', route.params.id)
      await updateDoc(docRef, dataToSave)
      router.push('/')
    } else {
      const docRef = await addDoc(collection(db, 'schools'), dataToSave)
      savedDocId.value = docRef.id
      saveSuccess.value = true
    }
  } catch (error) {
    console.error('Error saving:', error)
    alert('Error saving data')
  }
  loading.value = false
}

async function saveAdditionalInfo() {
  loading.value = true
  try {
    const docRef = doc(db, 'schools', savedDocId.value)
    await updateDoc(docRef, {
      additionalProducts: form.value.additionalProducts,
      additionalProductTypes: form.value.additionalProducts ? form.value.additionalProductTypes : []
    })
    router.push('/')
  } catch (error) {
    console.error('Error saving additional info:', error)
    alert('Error saving additional info')
  }
  loading.value = false
}
</script>

<template>
  <div v-if="!saveSuccess" class="intro-container">
    <p class="intro-text">
      Thank you for contributing to this essential work of improving reading instruction for ALL kids.
      <br><br>With this
      critical
      information, teachers, leaders, and researchers can better zero in on exactly what works best for each child.
    </p>
  </div>
  <div class="form-container">
    <h1 v-if="!saveSuccess">{{ isEdit ? 'Edit' : 'Add' }} School</h1>

    <form v-if="!saveSuccess" @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="state">State</label>
        <select id="state" v-model="form.state" required :disabled="loadingStates">
          <option value="">{{ loadingStates ? 'Loading states...' : 'Select a state' }}</option>
          <option v-for="state in states" :key="state" :value="state">
            {{ state }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label for="district">District</label>
        <select id="district" v-model="form.districtId" required :disabled="!form.state || loadingDistricts">
          <option value="">
            {{ loadingDistricts ? 'Loading districts...' : (form.state ? 'Select a district' : 'Select a state first')
            }}
          </option>
          <option v-for="district in districts" :key="district.LEAID" :value="district.LEAID">
            {{ district.LEA_NAME }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label for="school">School</label>
        <select id="school" v-model="form.schoolId" required :disabled="!form.districtId || loadingSchools">
          <option value="">
            {{ loadingSchools ? 'Loading schools...' : (form.districtId ? 'Select a school' : 'Select a district first')
            }}
          </option>
          <option v-for="school in schools" :key="school.NCESSCH" :value="school.NCESSCH">
            {{ school.SCH_NAME }}
          </option>
        </select>
      </div>

      <section class="form-section">
        <h2>ELA Curriculum</h2>

        <div class="subsection">
          <h3>Foundations</h3>

          <div class="form-group">
            <label class="question-label">
              Does your school use the same curricular product for both foundational (phonics) instruction, and for the
              rest of the reading block?
            </label>
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" v-model="form.elaSameCurriculum" :value="true" name="elaSameCurriculum" />
                <span>Yes</span>
              </label>
              <label class="radio-option">
                <input type="radio" v-model="form.elaSameCurriculum" :value="false" name="elaSameCurriculum" />
                <span>No</span>
              </label>
            </div>
          </div>

          <div v-if="form.elaSameCurriculum === false" class="conditional-fields">
            <div class="form-group">
              <label for="foundationsProvider">Provider</label>
              <select id="foundationsProvider" v-model="form.foundationsProvider">
                <option value="">Select a provider</option>
                <option v-for="provider in providers" :key="provider" :value="provider">
                  {{ provider }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="foundationsProduct">Product</label>
              <select id="foundationsProduct" v-model="form.foundationsProduct"
                :disabled="!form.foundationsProvider || availableFoundationsProducts.length === 0">
                <option value="">{{ !form.foundationsProvider ? 'Select a provider first' : (availableFoundationsProducts.length
                  === 0 ? 'Enter product below' : 'Select a product') }}</option>
                <option v-for="product in availableFoundationsProducts" :key="product" :value="product">
                  {{ product }}
                </option>
              </select>
              <input
                v-if="form.foundationsProvider === 'Other' || (form.foundationsProvider && availableFoundationsProducts.length === 0)"
                v-model="form.foundationsProduct" type="text" placeholder="Enter product name" class="other-input" />
            </div>

            <div class="form-group">
              <label for="foundationsYear">Publication Year</label>
              <select id="foundationsYear" v-model="form.foundationsYear">
                <option value="">Select year</option>
                <option v-for="year in [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015]" :key="year"
                  :value="year.toString()">
                  {{ year }}
                </option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        <div class="subsection">
          <h3>General, Comprehensive, or Knowledge-Building ELA Curriculum</h3>

          <div class="form-group">
            <label for="generalElaProvider">Provider</label>
            <select id="generalElaProvider" v-model="form.generalElaProvider">
              <option value="">Select a provider</option>
              <option v-for="provider in providers" :key="provider" :value="provider">
                {{ provider }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="generalElaProduct">Product</label>
            <select id="generalElaProduct" v-model="form.generalElaProduct"
              :disabled="!form.generalElaProvider || availableGeneralElaProducts.length === 0">
              <option value="">{{ !form.generalElaProvider ? 'Select a provider first' : (availableGeneralElaProducts.length === 0 ? 'Enter product below' : 'Select a product') }}</option>
              <option v-for="product in availableGeneralElaProducts" :key="product" :value="product">
                {{ product }}
              </option>
            </select>
            <input
              v-if="form.generalElaProvider === 'Other' || (form.generalElaProvider && availableGeneralElaProducts.length === 0)"
              v-model="form.generalElaProduct" type="text" placeholder="Enter product name" class="other-input" />
          </div>

          <div class="form-group">
            <label for="generalElaYear">Publication Year</label>
            <select id="generalElaYear" v-model="form.generalElaYear">
              <option value="">Select year</option>
              <option v-for="year in [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015]" :key="year"
                :value="year.toString()">
                {{ year }}
              </option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </section>

      <section class="form-section">
        <h2>Training & Implementation</h2>

        <div class="subsection">
          <div class="form-group">
            <label class="question-label">
              Were most or all building teachers given specific training in implementing the general ELA curriculum product?
            </label>
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" v-model="form.trainingGeneralEla" :value="true" name="trainingGeneralEla" />
                <span>Yes</span>
              </label>
              <label class="radio-option">
                <input type="radio" v-model="form.trainingGeneralEla" :value="false" name="trainingGeneralEla" />
                <span>No</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label for="elaImplementationYear" class="question-label">
              What year was the current ELA curriculum first implemented?
            </label>
            <select id="elaImplementationYear" v-model="form.elaImplementationYear">
              <option value="">Select year</option>
              <option v-for="year in [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015]" :key="year"
                :value="year.toString()">
                {{ year }}
              </option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div class="form-group">
            <label class="question-label">
              Did most of the building teachers receive general training in the Science of Reading?
            </label>
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" v-model="form.trainingScienceOfReading" :value="true" name="trainingScienceOfReading" />
                <span>Yes</span>
              </label>
              <label class="radio-option">
                <input type="radio" v-model="form.trainingScienceOfReading" :value="false" name="trainingScienceOfReading" />
                <span>No</span>
              </label>
            </div>
          </div>

          <div v-if="form.trainingScienceOfReading === true" class="form-group conditional-fields">
            <label for="sorTrainingProgram" class="question-label">
              Which training did most receive?
            </label>
            <select id="sorTrainingProgram" v-model="form.sorTrainingProgram">
              <option value="">Select a program</option>
              <option v-for="program in trainingPrograms" :key="program" :value="program">
                {{ program }}
              </option>
            </select>
          </div>
        </div>
      </section>

      <div class="form-actions">
        <button type="button" class="btn-secondary" @click="router.push('/')">
          Cancel
        </button>
        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Saving...' : (isEdit ? 'Update' : 'Save') }}
        </button>
      </div>
    </form>

    <section v-if="saveSuccess" class="form-section success-section">
      <h2>Thank You!</h2>
      <p class="success-message">
        Your school has been saved. Additional info would really help more teachers succeed:
      </p>

      <div class="subsection">
        <div class="form-group">
          <label class="question-label">
            Does your school use any additional literacy products beyond the core ELA curriculum?
          </label>
          <div class="radio-group">
            <label class="radio-option">
              <input type="radio" v-model="form.additionalProducts" :value="true" name="additionalProducts" />
              <span>Yes</span>
            </label>
            <label class="radio-option">
              <input type="radio" v-model="form.additionalProducts" :value="false" name="additionalProducts" />
              <span>No</span>
            </label>
          </div>
        </div>

        <div v-if="form.additionalProducts === true" class="form-group conditional-fields">
          <label class="question-label">
            What types of additional products are used? (Select all that apply)
          </label>
          <div class="checkbox-group">
            <label class="checkbox-option" v-for="productType in additionalProductTypeOptions" :key="productType">
              <input
                type="checkbox"
                :value="productType"
                v-model="form.additionalProductTypes"
              />
              <span>{{ productType }}</span>
            </label>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn-secondary" @click="router.push('/')">
          Skip
        </button>
        <button
          type="button"
          class="btn-primary"
          :disabled="loading || form.additionalProducts === null"
          @click="saveAdditionalInfo"
        >
          {{ loading ? 'Saving...' : 'Save & Finish' }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.intro-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem 2rem 0 2rem;
}

.intro-text {
  color: #555;
  line-height: 1.6;
  margin: 0;
  padding: 0.5rem;
  padding-left: 0rem;
  background-color: #f0f7f4;

}

.form-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  margin-bottom: 1.5rem;
  color: #333;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #555;
}

select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
  background-color: white;
  cursor: pointer;
}

select:focus {
  outline: none;
  border-color: #4a90a4;
  box-shadow: 0 0 0 2px rgba(74, 144, 164, 0.2);
}

select:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: #4a90a4;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #3a7a8a;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #e0e0e0;
  color: #333;
}

.btn-secondary:hover {
  background-color: #d0d0d0;
}

.form-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 2px solid #e0e0e0;
}

.form-section h2 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.25rem;
}

.subsection {
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.subsection h3 {
  margin: 0 0 1rem 0;
  color: #555;
  font-size: 1rem;
  font-weight: 600;
}

.question-label {
  font-weight: 400;
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.radio-group {
  display: flex;
  gap: 1.5rem;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 400;
}

.radio-option input[type="radio"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.conditional-fields {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #ddd;
}

input[type="text"] {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

input[type="text"]:focus {
  outline: none;
  border-color: #4a90a4;
  box-shadow: 0 0 0 2px rgba(74, 144, 164, 0.2);
}

.other-input {
  margin-top: 0.5rem;
}

.success-section {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

.success-message {
  color: #2e7d32;
  font-size: 1.1rem;
  line-height: 1.6;
  padding: 1rem;
  background-color: #e8f5e9;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 400;
}

.checkbox-option input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}
</style>
