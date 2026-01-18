import { ref, computed } from 'vue'
import { auth, googleProvider } from '../firebase'
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'

const user = ref(null)
const loading = ref(true)
let initialized = false

const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(e => e)

const isAdmin = computed(() => {
  if (!user.value?.email) return false
  return adminEmails.includes(user.value.email.toLowerCase())
})

function initAuth() {
  if (initialized) return
  initialized = true
  onAuthStateChanged(auth, (firebaseUser) => {
    user.value = firebaseUser
    loading.value = false
  })
}

export function useAuth() {
  initAuth()

  async function loginWithGoogle() {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
      console.error('Google login error:', error)
      throw error
    }
  }

  async function loginWithEmail(email, password) {
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      console.error('Email login error:', error)
      throw error
    }
  }

  async function signUpWithEmail(email, password) {
    try {
      await createUserWithEmailAndPassword(auth, email, password)
    } catch (error) {
      console.error('Email signup error:', error)
      throw error
    }
  }

  async function logout() {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  return {
    user,
    loading,
    isAdmin,
    loginWithGoogle,
    loginWithEmail,
    signUpWithEmail,
    logout
  }
}
