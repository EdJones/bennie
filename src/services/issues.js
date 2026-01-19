import { db } from '../firebase'
import { collection, addDoc, doc, updateDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore'

export async function createIssue(user, issueData) {
  try {
    const issueDoc = {
      title: issueData.title,
      description: issueData.description,
      type: issueData.type || 'other',
      priority: issueData.priority || 'medium',
      status: 'open',
      createdBy: user.uid,
      createdByEmail: user.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    const docRef = await addDoc(collection(db, 'issues'), issueDoc)
    return docRef.id
  } catch (error) {
    console.error('Error creating issue:', error)
    throw error
  }
}

export async function getIssues(statusFilter = null) {
  try {
    let q = query(collection(db, 'issues'), orderBy('createdAt', 'desc'))
    
    // Note: Firestore doesn't support filtering by multiple fields easily
    // If statusFilter is provided, we'll filter in memory after fetching
    const querySnapshot = await getDocs(q)
    let issues = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    if (statusFilter && statusFilter !== 'all') {
      issues = issues.filter(issue => issue.status === statusFilter)
    }
    
    return issues
  } catch (error) {
    console.error('Error fetching issues:', error)
    throw error
  }
}

export async function updateIssueStatus(issueId, status, user) {
  try {
    const issueRef = doc(db, 'issues', issueId)
    await updateDoc(issueRef, {
      status,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid
    })
  } catch (error) {
    console.error('Error updating issue status:', error)
    throw error
  }
}
