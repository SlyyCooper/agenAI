import { getAuth } from 'firebase/auth';

const BASE_URL = 'https://dolphin-app-49eto.ondigitalocean.app/backend';

// Types
export interface UserProfile {
  email: string;
  name?: string;
  created_at: string;
  last_login: string;
  has_access: boolean;
  stripe_customer_id?: string;
  subscription_status?: string;
  subscription_end_date?: string;
  subscription_current_period_end?: number;
  one_time_purchase?: boolean;
  tokens: number;
}

interface UserProfileUpdateRequest {
  email?: string;
  name?: string;
  [key: string]: any;
}

export interface SubscriptionData {
  has_access: boolean;
  subscription_status?: string;
  subscription_end_date?: string;
  one_time_purchase: boolean;
  payment_history: any[];
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  status?: string;
}

export interface PaymentHistory {
  payments: Array<{
    id: string;
    amount: number;
    status: string;
    created: number;
    currency: string;
  }>;
}

export interface AccessStatus {
  has_access: boolean;
  access_type: 'subscription' | 'one_time' | null;
  access_expiry?: string;
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
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get user profile');
    }
    return await response.json();
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

export const createUserProfile = async (data: { email: string; name?: string }): Promise<UserProfile> => {
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
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create user profile');
    }
    return await response.json();
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (data: UserProfileUpdateRequest): Promise<UserProfile> => {
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
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update user profile');
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const getUserSubscription = async (): Promise<SubscriptionData> => {
  try {
    const firebaseToken = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/user/subscription`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch subscription');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    throw error;
  }
};

export const getPaymentHistory = async (): Promise<PaymentHistory> => {
  try {
    const firebaseToken = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/user/payment-history`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch payment history');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching payment history:', error);
    throw error;
  }
};

export const getAccessStatus = async (): Promise<AccessStatus> => {
  try {
    const firebaseToken = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/user/access-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch access status');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching access status:', error);
    throw error;
  }
};
