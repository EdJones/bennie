<script setup>
</script>

<template>
  <div id="app">
    <header>
      <h2>Bennie</h2>
    </header>
    <main>
      <router-view />
    </main>
  </div>
</template>

<style scoped>
header {
  background-color: #4a90a4;
  color: white;
  padding: 1rem 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

header h2 {
  margin: 0;
  font-weight: 600;
}

main {
  min-height: calc(100vh - 60px);
  background-color: #f5f7fa;
}
</style>
