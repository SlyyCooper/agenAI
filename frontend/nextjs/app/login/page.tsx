'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Brain, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, TwitterAuthProvider } from 'firebase/auth'
import { auth } from '@/config/firebase/firebase'
import GoogleSignInButton from '@/components/GoogleSignInButton'
import XSignInButton from '@/components/XSigninButton'
import { useAuth } from '@/config/firebase/AuthContext'
import Image from 'next/image'
import { createUserProfile, getUserProfile } from '@/actions/userprofileAPI'

interface AuthError {
  code?: string;
  message: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { user, loading } = useAuth()

  const handleAuthError = (error: AuthError) => {
    switch (error.code) {
      case 'auth/user-not-found':
        setError('No account found with this email. Please sign up.')
        break
      case 'auth/wrong-password':
        setError('Incorrect password. Please try again.')
        break
      case 'auth/invalid-email':
        setError('Invalid email address.')
        break
      case 'auth/too-many-requests':
        setError('Too many failed attempts. Please try again later.')
        break
      default:
        setError(error.message || 'An error occurred during sign in')
    }
  }

  const verifyUserProfile = async () => {
    try {
      // Try to get existing profile
      const profile = await getUserProfile()
      
      // If profile exists but missing required fields, update it
      if (profile && auth.currentUser) {
        const updates: any = {}
        
        if (!profile.email && auth.currentUser.email) {
          updates.email = auth.currentUser.email
        }
        if (!profile.name && auth.currentUser.displayName) {
          updates.name = auth.currentUser.displayName
        }
        
        // If any updates needed, create/update profile
        if (Object.keys(updates).length > 0) {
          await createUserProfile(updates)
        }
      } else if (auth.currentUser) {
        // Create new profile if doesn't exist
        await createUserProfile({
          email: auth.currentUser.email!,
          name: auth.currentUser.displayName || undefined
        })
      }
    } catch (error) {
      console.error('Error verifying user profile:', error)
      // Don't throw error - let user continue even if profile verification fails
    }
  }

  const handleEmailPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!auth) {
      setError('Authentication not initialized')
      setIsLoading(false)
      return
    }

    try {
      // Sign in with Firebase
      await signInWithEmailAndPassword(auth, email, password)
      
      // Verify/update user profile
      await verifyUserProfile()
      
      router.push('/research')
    } catch (error: any) {
      console.error('Error signing in:', error)
      handleAuthError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialSignIn = async (provider: GoogleAuthProvider | TwitterAuthProvider) => {
    setIsLoading(true)
    setError('')

    if (!auth) {
      setError('Authentication not initialized')
      setIsLoading(false)
      return
    }

    try {
      // Sign in with social provider
      const result = await signInWithPopup(auth, provider)
      
      // Verify/update user profile
      await verifyUserProfile()
      
      router.push('/research')
    } catch (error: any) {
      console.error('Error signing in:', error)
      handleAuthError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = () => handleSocialSignIn(new GoogleAuthProvider())
  const handleXSignIn = () => handleSocialSignIn(new TwitterAuthProvider())

  if (user) {
    router.push('/research')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900 flex flex-col justify-center items-center px-4">
      <motion.div 
        className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="p-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/TAN.png"
              alt="TANgent Logo"
              width={100}
              height={100}
              priority
            />
          </div>
          <h2 className="text-3xl font-bold text-center mb-6">Welcome Back</h2>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          <form onSubmit={handleEmailPasswordSignIn} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <button
                type="submit"
                className="w-full bg-black text-white px-4 py-2 rounded-full font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="mt-6 flex justify-center space-x-4">
            <GoogleSignInButton onClick={handleGoogleSignIn} />
            <XSignInButton onClick={handleXSignIn} />
          </div>
          
          <div className="mt-4 text-center">
            <Link href="/signup" className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
              Don&apos;t have an account? Sign up
            </Link>
          </div>
        </div>
      </motion.div>
      <motion.div
        className="mt-8 flex items-center text-gray-600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Brain className="h-6 w-5 mr-2" />
        <span>Powered by AI</span>
      </motion.div>
    </div>
  )
}
