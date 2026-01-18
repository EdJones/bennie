<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../firebase'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'

const router = useRouter()
const schools = ref([])
const loading = ref(true)

async function fetchSchools() {
  loading.value = true
  try {
    const querySnapshot = await getDocs(collection(db, 'schools'))
    schools.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching schools:', error)
  }
  loading.value = false
}

async function deleteSchool(id) {
  if (!confirm('Are you sure you want to delete this entry?')) return

  try {
    await deleteDoc(doc(db, 'schools', id))
    schools.value = schools.value.filter(s => s.id !== id)
  } catch (error) {
    console.error('Error deleting:', error)
    alert('Error deleting entry')
  }
}

onMounted(fetchSchools)
</script>

<template>
  <div class="list-container">
    <div class="header">
      <h1>Schools</h1>
      <button class="btn-primary" @click="router.push('/add')">
        + Add New
      </button>
    </div>

    <div v-if="loading" class="loading">Loading...</div>

    <div v-else-if="schools.length === 0" class="empty">
      No schools added yet. Click "Add New" to get started.
    </div>

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
        <tr v-for="school in schools" :key="school.id">
          <td>{{ school.state }}</td>
          <td>{{ school.districtName }}</td>
          <td>{{ school.schoolName }}</td>
          <td class="actions">
            <button class="btn-view" @click="router.push(`/view/${school.id}`)">
              View
            </button>
            <button class="btn-edit" @click="router.push(`/edit/${school.id}`)">
              Edit
            </button>
            <button class="btn-delete" @click="deleteSchool(school.id)">
              Delete
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.list-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
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

.loading, .empty {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.schools-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

th, td {
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

.btn-view, .btn-edit, .btn-delete {
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
</style>
