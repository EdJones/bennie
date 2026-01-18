import { db } from '../firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export async function logActivity(type, data) {
  try {
    await addDoc(collection(db, 'activityLog'), {
      type,
      ...data,
      timestamp: serverTimestamp()
    })
  } catch (error) {
    console.error('Error logging activity:', error)
  }
}

export async function logSignup(user) {
  await logActivity('signup', {
    userId: user.uid,
    email: user.email,
    displayName: user.displayName || null,
    provider: user.providerData?.[0]?.providerId || 'unknown'
  })
}

export async function logSchoolCreate(user, schoolId, schoolData) {
  await logActivity('school_create', {
    userId: user.uid,
    email: user.email,
    schoolId,
    schoolName: schoolData.schoolName,
    districtName: schoolData.districtName,
    state: schoolData.state
  })
}

export async function logSchoolEdit(user, schoolId, schoolData) {
  await logActivity('school_edit', {
    userId: user.uid,
    email: user.email,
    schoolId,
    schoolName: schoolData.schoolName,
    districtName: schoolData.districtName,
    state: schoolData.state
  })
}

export async function logSchoolDelete(user, schoolId, schoolData) {
  await logActivity('school_delete', {
    userId: user.uid,
    email: user.email,
    schoolId,
    schoolName: schoolData.schoolName,
    districtName: schoolData.districtName,
    state: schoolData.state
  })
}
