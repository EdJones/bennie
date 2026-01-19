<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../firebase'
import { useAuth } from '../composables/useAuth'
import { createIssue, getIssues, updateIssueStatus } from '../services/issues'

const router = useRouter()
const { user, isAdmin } = useAuth()

const issues = ref([])
const loading = ref(true)
const showCreateForm = ref(false)
const statusFilter = ref('all')

const newIssue = ref({
  title: '',
  description: '',
  type: 'other',
  priority: 'medium'
})

const issueTypes = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'data', label: 'Data Issue' },
  { value: 'other', label: 'Other' }
]

const priorities = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
]

const statuses = [
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' }
]

async function fetchIssues() {
  loading.value = true
  try {
    issues.value = await getIssues(statusFilter.value === 'all' ? null : statusFilter.value)
  } catch (error) {
    console.error('Error fetching issues:', error)
    alert('Error loading issues')
  }
  loading.value = false
}

async function handleCreateIssue() {
  if (!newIssue.value.title.trim() || !newIssue.value.description.trim()) {
    alert('Please fill in all required fields')
    return
  }

  try {
    await createIssue(user.value, newIssue.value)
    newIssue.value = { title: '', description: '', type: 'other', priority: 'medium' }
    showCreateForm.value = false
    await fetchIssues()
  } catch (error) {
    console.error('Error creating issue:', error)
    alert('Error creating issue')
  }
}

async function handleStatusChange(issueId, newStatus) {
  try {
    await updateIssueStatus(issueId, newStatus, user.value)
    await fetchIssues()
  } catch (error) {
    console.error('Error updating issue status:', error)
    alert('Error updating issue status')
  }
}

function formatDate(timestamp) {
  if (!timestamp) return '—'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleString()
}

function getStatusClass(status) {
  const classes = {
    'open': 'status-open',
    'in-progress': 'status-in-progress',
    'resolved': 'status-resolved',
    'closed': 'status-closed'
  }
  return classes[status] || ''
}

function getStatusLabel(status) {
  const statusObj = statuses.find(s => s.value === status)
  return statusObj ? statusObj.label : status
}

function getTypeLabel(type) {
  const typeObj = issueTypes.find(t => t.value === type)
  return typeObj ? typeObj.label : type
}

function getPriorityClass(priority) {
  const classes = {
    'low': 'priority-low',
    'medium': 'priority-medium',
    'high': 'priority-high',
    'critical': 'priority-critical'
  }
  return classes[priority] || ''
}

function getPriorityLabel(priority) {
  const priorityObj = priorities.find(p => p.value === priority)
  return priorityObj ? priorityObj.label : priority
}

onMounted(() => {
  fetchIssues()
})
</script>

<template>
  <div class="issues-container">
    <div class="header">
      <h1>Issues Tracker</h1>
      <div class="header-actions">
        <button class="btn-secondary" @click="router.push('/')">Back to List</button>
        <button v-if="!showCreateForm" class="btn-primary" @click="showCreateForm = true">
          + New Issue
        </button>
      </div>
    </div>

    <div v-if="showCreateForm" class="create-form-section">
      <h2>Create New Issue</h2>
      <form @submit.prevent="handleCreateIssue">
        <div class="form-group">
          <label for="title">Title *</label>
          <input id="title" v-model="newIssue.title" type="text" required placeholder="Brief description of the issue" />
        </div>

        <div class="form-group">
          <label for="description">Description *</label>
          <textarea id="description" v-model="newIssue.description" rows="5" required placeholder="Detailed description of the issue"></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="type">Type</label>
            <select id="type" v-model="newIssue.type">
              <option v-for="type in issueTypes" :key="type.value" :value="type.value">
                {{ type.label }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="priority">Priority</label>
            <select id="priority" v-model="newIssue.priority">
              <option v-for="priority in priorities" :key="priority.value" :value="priority.value">
                {{ priority.label }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-secondary" @click="showCreateForm = false">Cancel</button>
          <button type="submit" class="btn-primary">Create Issue</button>
        </div>
      </form>
    </div>

    <div class="filters">
      <label>Filter by Status:</label>
      <select v-model="statusFilter" @change="fetchIssues">
        <option value="all">All</option>
        <option v-for="status in statuses" :key="status.value" :value="status.value">
          {{ status.label }}
        </option>
      </select>
    </div>

    <div v-if="loading" class="loading">Loading issues...</div>

    <div v-else-if="issues.length === 0" class="empty">
      No issues found{{ statusFilter !== 'all' ? ` with status "${getStatusLabel(statusFilter)}"` : '' }}.
    </div>

    <div v-else class="issues-list">
      <table class="issues-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Created By</th>
            <th>Created At</th>
            <th v-if="isAdmin">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="issue in issues" :key="issue.id">
            <td>
              <div class="issue-title">{{ issue.title }}</div>
              <div class="issue-description">{{ issue.description }}</div>
            </td>
            <td>
              <span class="type-badge">{{ getTypeLabel(issue.type) }}</span>
            </td>
            <td>
              <span class="priority-badge" :class="getPriorityClass(issue.priority)">
                {{ getPriorityLabel(issue.priority) }}
              </span>
            </td>
            <td>
              <span class="status-badge" :class="getStatusClass(issue.status)">
                {{ getStatusLabel(issue.status) }}
              </span>
            </td>
            <td class="email">{{ issue.createdByEmail }}</td>
            <td class="timestamp">{{ formatDate(issue.createdAt) }}</td>
            <td v-if="isAdmin" class="actions">
              <select 
                :value="issue.status" 
                @change="handleStatusChange(issue.id, $event.target.value)"
                class="status-select"
              >
                <option v-for="status in statuses" :key="status.value" :value="status.value">
                  {{ status.label }}
                </option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.issues-container {
  max-width: 1200px;
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

.header-actions {
  display: flex;
  gap: 1rem;
}

.btn-primary {
  background-color: #4a90a4;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
}

.btn-primary:hover {
  background-color: #3a7a8a;
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

.create-form-section {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.create-form-section h2 {
  margin: 0 0 1.5rem 0;
  color: #333;
  font-size: 1.25rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #555;
}

input[type="text"],
textarea,
select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

textarea {
  resize: vertical;
  font-family: inherit;
}

input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: #4a90a4;
  box-shadow: 0 0 0 2px rgba(74, 144, 164, 0.2);
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.filters {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.filters label {
  margin: 0;
  font-weight: 500;
  color: #555;
}

.filters select {
  width: auto;
  min-width: 150px;
}

.loading,
.empty {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.issues-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.issues-table th,
.issues-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.issues-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #555;
  font-size: 0.875rem;
}

.issues-table tr:hover {
  background-color: #f8f9fa;
}

.issue-title {
  font-weight: 600;
  color: #333;
  margin-bottom: 0.25rem;
}

.issue-description {
  font-size: 0.875rem;
  color: #666;
  line-height: 1.4;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.email {
  font-size: 0.875rem;
}

.timestamp {
  font-size: 0.8rem;
  color: #666;
  white-space: nowrap;
}

.actions {
  white-space: nowrap;
}

.status-select {
  padding: 0.4rem 0.6rem;
  font-size: 0.875rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.type-badge,
.priority-badge,
.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.type-badge {
  background-color: #f0f0f0;
  color: #555;
}

.priority-low {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.priority-medium {
  background-color: #fff3e0;
  color: #ef6c00;
}

.priority-high {
  background-color: #ffe0b2;
  color: #e65100;
}

.priority-critical {
  background-color: #ffebee;
  color: #c62828;
}

.status-open {
  background-color: #e3f2fd;
  color: #1565c0;
}

.status-in-progress {
  background-color: #fff3e0;
  color: #ef6c00;
}

.status-resolved {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.status-closed {
  background-color: #f3e5f5;
  color: #6a1b9a;
}
</style>
