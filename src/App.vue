<script setup>
import { useAuth } from './composables/useAuth'
import { useRouter } from 'vue-router'

const router = useRouter()
const { user, isAdmin, logout } = useAuth()

async function handleLogout() {
  await logout()
  router.push('/login')
}
</script>

<template>
  <div id="app">
    <header>
      <div class="header-content">
        <div class="header-left">
          <img src="/bennie.png" alt="Bennie the school detective dog" class="logo" />
          <div class="header-text">
            <h1>Bennett</h1>
            <p class="subtitle">The National Survey of School Reading Curricula</p>
          </div>
        </div>
        <div v-if="user" class="header-right">
          <span class="user-email">{{ user.email }}</span>
          <button class="header-btn" @click="router.push('/issues')">Issues</button>
          <button v-if="isAdmin" class="header-btn" @click="router.push('/admin')">Admin</button>
          <button class="header-btn" @click="handleLogout">Logout</button>
        </div>
      </div>
    </header>
    <main>
      <router-view />
    </main>
  </div>
</template>

<style scoped>
header {
  background: linear-gradient(135deg, #5a4a3a 0%, #3a2a1a 100%);
  color: white;
  padding: 1rem 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 900px;
  margin: 0 auto;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-email {
  font-size: 0.875rem;
  opacity: 0.9;
}

.header-btn {
  background-color: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.header-btn:hover {
  background-color: rgba(255, 255, 255, 0.25);
}

.logo {
  height: 120px;
  width: 120px;
  border-radius: 12px;
  object-fit: cover;
  border: 3px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

header h1 {
  margin: 0;
  font-family: 'Baloo 2', cursive;
  font-weight: 700;
  font-size: 2.5rem;
  letter-spacing: 1px;
}

.subtitle {
  margin: 0.25rem 0 0 0;
  font-size: 1.4rem;
  opacity: 0.9;
  font-weight: 400;
}

main {
  min-height: calc(100vh - 140px);
  background-color: #f5f7fa;
}
</style>
