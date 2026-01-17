<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../firebase'
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore'
import { getStates, getDistricts, getSchools } from '../services/nces'

const route = useRoute()
const router = useRouter()

const form = ref({
  state: '',
  districtId: '',
  districtName: '',
  schoolId: '',
  schoolName: ''
})

const states = ref([])
const districts = ref([])
const schools = ref([])

const loading = ref(false)
const loadingStates = ref(false)
const loadingDistricts = ref(false)
const loadingSchools = ref(false)
const isEdit = ref(false)

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

async function handleSubmit() {
  loading.value = true
  try {
    const dataToSave = {
      state: form.value.state,
      districtId: form.value.districtId,
      districtName: form.value.districtName,
      schoolId: form.value.schoolId,
      schoolName: form.value.schoolName
    }

    if (isEdit.value) {
      const docRef = doc(db, 'schools', route.params.id)
      await updateDoc(docRef, dataToSave)
    } else {
      await addDoc(collection(db, 'schools'), dataToSave)
    }
    router.push('/')
  } catch (error) {
    console.error('Error saving:', error)
    alert('Error saving data')
  }
  loading.value = false
}
</script>

<template>
  <div class="form-container">
    <h1>{{ isEdit ? 'Edit' : 'Add' }} School</h1>

    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="state">State</label>
        <select
          id="state"
          v-model="form.state"
          required
          :disabled="loadingStates"
        >
          <option value="">{{ loadingStates ? 'Loading states...' : 'Select a state' }}</option>
          <option v-for="state in states" :key="state" :value="state">
            {{ state }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label for="district">District</label>
        <select
          id="district"
          v-model="form.districtId"
          required
          :disabled="!form.state || loadingDistricts"
        >
          <option value="">
            {{ loadingDistricts ? 'Loading districts...' : (form.state ? 'Select a district' : 'Select a state first') }}
          </option>
          <option v-for="district in districts" :key="district.LEAID" :value="district.LEAID">
            {{ district.LEA_NAME }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label for="school">School</label>
        <select
          id="school"
          v-model="form.schoolId"
          required
          :disabled="!form.districtId || loadingSchools"
        >
          <option value="">
            {{ loadingSchools ? 'Loading schools...' : (form.districtId ? 'Select a school' : 'Select a district first') }}
          </option>
          <option v-for="school in schools" :key="school.NCESSCH" :value="school.NCESSCH">
            {{ school.SCH_NAME }}
          </option>
        </select>
      </div>

      <div class="form-actions">
        <button type="button" class="btn-secondary" @click="router.push('/')">
          Cancel
        </button>
        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Saving...' : (isEdit ? 'Update' : 'Save') }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.form-container {
  max-width: 500px;
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
</style>
