<script setup>
</script>

<template>
  <div id="app">
    <header>
      <div class="header-content">
        <img src="/bennie.png" alt="Bennie the school detective dog" class="logo" />
        <h1>Bennie</h1>
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
  gap: 1.5rem;
  max-width: 900px;
  margin: 0 auto;
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
  font-weight: 700;
  font-size: 2.5rem;
  letter-spacing: 1px;
}

main {
  min-height: calc(100vh - 140px);
  background-color: #f5f7fa;
}
</style>
