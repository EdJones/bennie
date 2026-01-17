import { createRouter, createWebHistory } from 'vue-router'
import SchoolList from '../views/SchoolList.vue'
import SchoolForm from '../views/SchoolForm.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: SchoolList
  },
  {
    path: '/add',
    name: 'add',
    component: SchoolForm
  },
  {
    path: '/edit/:id',
    name: 'edit',
    component: SchoolForm
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
