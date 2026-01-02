import { signInWithGoogle, logout } from '../auth/googleAuth'
import { useFirebaseAuth } from '../auth/useAuth'

export default function GoogleLoginButton() {
  const { user, loading } = useFirebaseAuth()

  if (loading) return null

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <img
          src={user.photoURL ?? ''}
          className="w-10 h-10 rounded-full"
        />
        <span className="text-white">{user.displayName}</span>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-500 text-white rounded-lg"
        >
          Logout
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={signInWithGoogle}
      className="px-6 py-3 bg-white text-black rounded-xl flex items-center gap-3 hover:bg-gray-200"
    >
      <img src="/google.svg" className="w-5 h-5" />
      Sign in with Google
    </button>
  )
}
