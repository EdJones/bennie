<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { loginWithGoogle, loginWithEmail, signUpWithEmail } = useAuth()
const error = ref('')
const loggingIn = ref(false)
const isSignUp = ref(false)
const email = ref('')
const password = ref('')

async function handleGoogleLogin() {
  error.value = ''
  loggingIn.value = true
  try {
    await loginWithGoogle()
    router.push('/')
  } catch (err) {
    error.value = err.message || 'Login failed. Please try again.'
  }
  loggingIn.value = false
}

async function handleEmailSubmit() {
  error.value = ''
  if (!email.value || !password.value) {
    error.value = 'Please enter email and password.'
    return
  }
  loggingIn.value = true
  try {
    if (isSignUp.value) {
      await signUpWithEmail(email.value, password.value)
    } else {
      await loginWithEmail(email.value, password.value)
    }
    router.push('/')
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      error.value = 'No account found with this email.'
    } else if (err.code === 'auth/wrong-password') {
      error.value = 'Incorrect password.'
    } else if (err.code === 'auth/email-already-in-use') {
      error.value = 'An account with this email already exists.'
    } else if (err.code === 'auth/weak-password') {
      error.value = 'Password should be at least 6 characters.'
    } else if (err.code === 'auth/invalid-email') {
      error.value = 'Please enter a valid email address.'
    } else {
      error.value = err.message || 'Login failed. Please try again.'
    }
  }
  loggingIn.value = false
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <h2>{{ isSignUp ? 'Create Account' : 'Sign In' }}</h2>
      <p class="login-subtitle">{{ isSignUp ? 'Enter your details to create an account' : 'Choose how to sign in' }}</p>

      <div v-if="error" class="error-message">{{ error }}</div>

      <form @submit.prevent="handleEmailSubmit" class="email-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            type="email"
            v-model="email"
            placeholder="you@example.com"
            :disabled="loggingIn"
          />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            type="password"
            v-model="password"
            placeholder="Enter password"
            :disabled="loggingIn"
          />
        </div>
        <button type="submit" class="btn-primary" :disabled="loggingIn">
          {{ loggingIn ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In') }}
        </button>
      </form>

      <p class="toggle-mode">
        {{ isSignUp ? 'Already have an account?' : "Don't have an account?" }}
        <a href="#" @click.prevent="isSignUp = !isSignUp; error = ''">
          {{ isSignUp ? 'Sign in' : 'Create one' }}
        </a>
      </p>

      <div class="divider">
        <span>or</span>
      </div>

      <div class="provider-buttons">
        <button
          class="provider-btn google"
          @click="handleGoogleLogin"
          :disabled="loggingIn"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Continue with Google</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 200px);
  padding: 2rem;
}

.login-card {
  background: white;
  border-radius: 12px;
  padding: 2.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.login-card h2 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.login-subtitle {
  color: #666;
  margin: 0 0 1.5rem 0;
}

.error-message {
  background-color: #fee;
  color: #c44;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
}

.email-form {
  text-align: left;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #555;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #4a90a4;
  box-shadow: 0 0 0 2px rgba(74, 144, 164, 0.2);
}

.btn-primary {
  width: 100%;
  padding: 0.875rem;
  background-color: #4a90a4;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background-color: #3a7a8a;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toggle-mode {
  margin: 1rem 0;
  color: #666;
  font-size: 0.875rem;
}

.toggle-mode a {
  color: #4a90a4;
  text-decoration: none;
}

.toggle-mode a:hover {
  text-decoration: underline;
}

.divider {
  display: flex;
  align-items: center;
  margin: 1.5rem 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #ddd;
}

.divider span {
  padding: 0 1rem;
  color: #999;
  font-size: 0.875rem;
}

.provider-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.provider-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.875rem 1.5rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.provider-btn:hover:not(:disabled) {
  background-color: #f8f9fa;
  border-color: #ccc;
}

.provider-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.provider-btn.google {
  color: #333;
}
</style>
