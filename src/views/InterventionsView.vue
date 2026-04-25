<script setup>
import { interventionProviders } from "../data/interventionProducts";
</script>

<template>
  <div class="interventions-container">
    <div class="interventions-section">
      <h1>Reading Intervention Products</h1>
      <p class="intro">
        Known intervention programs and materials in use across districts surveyed.
      </p>

      <div class="providers-list">
        <div v-for="provider in interventionProviders" :key="provider.name" class="provider-card">
          <h2 class="provider-name">{{ provider.name }}</h2>
          <ul v-if="provider.products.length" class="products-list">
            <li v-for="product in provider.products" :key="product" class="product-item">
              {{ product }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.interventions-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

.interventions-section {
  width: 100%;
}

h1 {
  margin-bottom: 0.5rem;
}

.intro {
  color: #666;
  margin-bottom: 2rem;
}

.providers-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.provider-card {
  background: white;
  border: 1px solid #e0e4ea;
  border-radius: 8px;
  padding: 1rem 1.25rem;
}

.provider-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #3a2a1a;
  margin: 0 0 0.5rem 0;
}

.products-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.product-item {
  font-size: 0.875rem;
  color: #555;
  padding: 0.2rem 0;
  border-top: 1px solid #f0f0f0;
}

.product-item:first-child {
  border-top: none;
}
</style>
