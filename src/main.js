import { createApp } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import './style.css'
import App from './App.vue'
import router from './router'

let app

onAuthStateChanged(auth, () => {
  if (!app) {
    app = createApp(App).use(router).mount('#app')
  }
})
