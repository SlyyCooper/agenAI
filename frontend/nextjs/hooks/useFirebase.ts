import { useCallback } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  TwitterAuthProvider,
  signInWithPopup,
  deleteUser,
  updateProfile,
  User
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../config/firebase/firebase';
import { useAuth } from '../config/firebase/AuthContext';
import { UserProfileData, UseFirebaseReturn } from '../types';

interface UpdateProfileData {
  name: string;
  notifications: boolean;
}

export const useFirebase = (): UseFirebaseReturn => {
  const { user } = useAuth();

  const createInitialUserProfile = async (
    user: User,
    name?: string,
    stripeCustomerId?: string
  ): Promise<void> => {
    const userProfile: UserProfileData = {
      email: user.email!,
      name: name || user.displayName || null,
      stripe_customer_id: stripeCustomerId || '',
      has_access: false,
      one_time_purchase: false,
      tokens: 0,
      token_history: [],
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
      notifications: false
    };

    await setDoc(doc(db, 'users', user.uid), userProfile);
  };

  const signIn = useCallback(async (email: string, password: string): Promise<User> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Update last login
      await updateDoc(doc(db, 'users', userCredential.user.uid), {
        last_login: serverTimestamp()
      });
      return userCredential.user;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string): Promise<User> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await createInitialUserProfile(userCredential.user, name);
      return userCredential.user;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<User> => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      
      // Check if user profile exists
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      
      // If not, create one
      if (!userDoc.exists()) {
        await createInitialUserProfile(result.user);
      } else {
        // Update last login
        await updateDoc(doc(db, 'users', result.user.uid), {
          last_login: serverTimestamp()
        });
      }
      
      return result.user;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }, []);

  const signInWithX = useCallback(async (): Promise<User> => {
    const provider = new TwitterAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      
      // Check if user profile exists
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      
      // If not, create one
      if (!userDoc.exists()) {
        await createInitialUserProfile(result.user);
      } else {
        // Update last login
        await updateDoc(doc(db, 'users', result.user.uid), {
          last_login: serverTimestamp()
        });
      }
      
      return result.user;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new Error(error.message);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(error.message);
    }
  }, []);

  const getUserData = useCallback(async () => {
    if (!user) return null;
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data() as UserProfileData) : null;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }, [user]);

  const deleteAccount = useCallback(async () => {
    if (!user) throw new Error('No user logged in');
    
    try {
      // Delete user data from Firestore
      const userRef = doc(db, 'users', user.uid);
      await deleteDoc(userRef);
      
      // Delete user's reports subcollection
      const reportsRef = doc(db, 'users', user.uid, 'reports');
      await deleteDoc(reportsRef);
      
      // Delete Firebase Auth user
      await deleteUser(user);
      
    } catch (error: any) {
      throw new Error(error.message);
    }
  }, [user]);

  const updateUserProfile = useCallback(async (data: UpdateProfileData) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      // Update Firebase Auth display name
      await updateProfile(user, {
        displayName: data.name
      });
      
      // Update Firestore user profile
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name: data.name,
        notifications: data.notifications,
        updated_at: serverTimestamp()
      });
      
    } catch (error: any) {
      throw new Error(error.message);
    }
  }, [user]);

  return {
    signIn,
    signUp,
    signInWithGoogle,
    signInWithX,
    logout,
    resetPassword,
    getUserData,
    deleteAccount,
    updateUserProfile,
    isAuthenticated: !!user
  };
}; 