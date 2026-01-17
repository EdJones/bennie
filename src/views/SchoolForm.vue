<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../firebase'
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore'

const route = useRoute()
const router = useRouter()

const form = ref({
  state: '',
  district: '',
  school: ''
})
const loading = ref(false)
const isEdit = ref(false)

onMounted(async () => {
  if (route.params.id) {
    isEdit.value = true
    loading.value = true
    const docRef = doc(db, 'schools', route.params.id)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      form.value = docSnap.data()
    }
    loading.value = false
  }
})

async function handleSubmit() {
  loading.value = true
  try {
    if (isEdit.value) {
      const docRef = doc(db, 'schools', route.params.id)
      await updateDoc(docRef, form.value)
    } else {
      await addDoc(collection(db, 'schools'), form.value)
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
        <input
          id="state"
          v-model="form.state"
          type="text"
          required
          placeholder="Enter state"
        />
      </div>

      <div class="form-group">
        <label for="district">District</label>
        <input
          id="district"
          v-model="form.district"
          type="text"
          required
          placeholder="Enter district"
        />
      </div>

      <div class="form-group">
        <label for="school">School</label>
        <input
          id="school"
          v-model="form.school"
          type="text"
          required
          placeholder="Enter school name"
        />
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

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

input:focus {
  outline: none;
  border-color: #4a90a4;
  box-shadow: 0 0 0 2px rgba(74, 144, 164, 0.2);
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
