import { createRouter, createWebHistory } from 'vue-router'
import { auth } from '../firebase'
import SchoolList from '../views/SchoolList.vue'
import SchoolForm from '../views/SchoolForm.vue'
import SchoolView from '../views/SchoolView.vue'
import LoginView from '../views/LoginView.vue'
import AdminPanel from '../views/AdminPanel.vue'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'home',
    component: SchoolList,
    meta: { requiresAuth: false }
  },
  {
    path: '/add',
    name: 'add',
    component: SchoolForm,
    meta: { requiresAuth: true }
  },
  {
    path: '/edit/:id',
    name: 'edit',
    component: SchoolForm,
    meta: { requiresAuth: true }
  },
  {
    path: '/view/:id',
    name: 'view',
    component: SchoolView,
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'admin',
    component: AdminPanel,
    meta: { requiresAuth: true, requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !auth.currentUser) {
    next('/login')
  } else if (to.path === '/login' && auth.currentUser) {
    next('/')
  } else {
    next()
  }
})

export default router
