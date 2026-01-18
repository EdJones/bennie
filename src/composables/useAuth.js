import { ref } from 'vue'
import { auth, googleProvider, githubProvider, microsoftProvider } from '../firebase'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'

const user = ref(null)
const loading = ref(true)
let initialized = false

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

  async function loginWithGithub() {
    try {
      await signInWithPopup(auth, githubProvider)
    } catch (error) {
      console.error('GitHub login error:', error)
      throw error
    }
  }

  async function loginWithMicrosoft() {
    try {
      await signInWithPopup(auth, microsoftProvider)
    } catch (error) {
      console.error('Microsoft login error:', error)
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
    loginWithGoogle,
    loginWithGithub,
    loginWithMicrosoft,
    logout
  }
}
