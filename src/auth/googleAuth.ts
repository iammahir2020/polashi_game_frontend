import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
  } from 'firebase/auth'
  import { auth } from '../lib/firebase'
  
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({
    prompt: 'select_account',
  })
  
  export const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, provider)
    return result.user
  }
  
  export const logout = async () => {
    await signOut(auth)
  }
  