<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../firebase'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { isAdmin } = useAuth()
const activities = ref([])
const loading = ref(true)

onMounted(async () => {
  if (!isAdmin.value) {
    router.push('/')
    return
  }

  try {
    const q = query(
      collection(db, 'activityLog'),
      orderBy('timestamp', 'desc'),
      limit(100)
    )
    const querySnapshot = await getDocs(q)
    activities.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching activity log:', error)
  }
  loading.value = false
})

function formatDate(timestamp) {
  if (!timestamp) return '—'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleString()
}

function getActivityLabel(type) {
  switch (type) {
    case 'signup': return 'User Signup'
    case 'school_create': return 'School Created'
    case 'school_edit': return 'School Edited'
    case 'school_delete': return 'School Deleted'
    default: return type
  }
}

function getActivityClass(type) {
  switch (type) {
    case 'signup': return 'activity-signup'
    case 'school_create': return 'activity-create'
    case 'school_edit': return 'activity-edit'
    case 'school_delete': return 'activity-delete'
    default: return ''
  }
}
</script>

<template>
  <div class="admin-container">
    <div class="header">
      <h1>Admin Panel</h1>
      <button class="btn-secondary" @click="router.push('/')">Back to List</button>
    </div>

    <div v-if="loading" class="loading">Loading activity log...</div>

    <div v-else-if="activities.length === 0" class="empty">
      No activity recorded yet.
    </div>

    <div v-else class="activity-list">
      <h2>Activity Log</h2>
      <table class="activity-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Type</th>
            <th>User</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="activity in activities" :key="activity.id">
            <td class="timestamp">{{ formatDate(activity.timestamp) }}</td>
            <td>
              <span class="activity-badge" :class="getActivityClass(activity.type)">
                {{ getActivityLabel(activity.type) }}
              </span>
            </td>
            <td class="email">{{ activity.email }}</td>
            <td class="details">
              <template v-if="activity.type === 'signup'">
                Provider: {{ activity.provider }}
              </template>
              <template v-else-if="activity.schoolName">
                {{ activity.schoolName }}
                <span class="secondary">{{ activity.districtName }}, {{ activity.state }}</span>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.admin-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
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

.btn-secondary {
  background-color: #e0e0e0;
  color: #333;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
}

.btn-secondary:hover {
  background-color: #d0d0d0;
}

.loading, .empty {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.activity-list h2 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: #555;
}

.activity-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.activity-table th,
.activity-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.activity-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #555;
  font-size: 0.875rem;
}

.activity-table tr:hover {
  background-color: #f8f9fa;
}

.timestamp {
  font-size: 0.8rem;
  color: #666;
  white-space: nowrap;
}

.email {
  font-size: 0.875rem;
}

.details {
  font-size: 0.875rem;
}

.details .secondary {
  display: block;
  color: #888;
  font-size: 0.8rem;
}

.activity-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.activity-signup {
  background-color: #e3f2fd;
  color: #1565c0;
}

.activity-create {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.activity-edit {
  background-color: #fff3e0;
  color: #ef6c00;
}

.activity-delete {
  background-color: #ffebee;
  color: #c62828;
}
</style>
