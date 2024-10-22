import { getAuth } from 'firebase/auth';

const BASE_URL = 'https://dolphin-app-49eto.ondigitalocean.app/backend';

// Types
export interface UserProfile {
  email: string;
  name?: string;
  created_at: string;
  last_login: string;
  has_access: boolean;
  subscription_status?: string;
  subscription_end_date?: string;
  one_time_purchase?: boolean;
}

interface UserProfileUpdateRequest {
  email?: string;
  name?: string;
  [key: string]: any;
}

// Helper function to get Firebase token
const getFirebaseToken = async (): Promise<string> => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('No user logged in');
  }
  return await currentUser.getIdToken();
};

// API Functions
export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    const firebaseToken = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/user/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Failed to fetch profile');
    return await response.json();
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

export const createUserProfile = async (data: { email: string; name?: string }): Promise<void> => {
  try {
    const firebaseToken = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/user/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create profile');
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (data: UserProfileUpdateRequest): Promise<void> => {
  try {
    const firebaseToken = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/user/update`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update profile');
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const getUserSubscription = async () => {
  try {
    const firebaseToken = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/user/subscription`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Failed to fetch subscription');
    return await response.json();
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    throw error;
  }
};

export const getPaymentHistory = async () => {
  try {
    const firebaseToken = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/user/payment-history`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Failed to fetch payment history');
    return await response.json();
  } catch (error) {
    console.error('Error fetching payment history:', error);
    throw error;
  }
};

export const getAccessStatus = async () => {
  try {
    const firebaseToken = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/user/access-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Failed to fetch access status');
    return await response.json();
  } catch (error) {
    console.error('Error fetching access status:', error);
    throw error;
  }
};
