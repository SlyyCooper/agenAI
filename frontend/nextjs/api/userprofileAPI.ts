import { getAuth } from 'firebase/auth';
import {
  UserProfileData,
  UserProfileCreate,
  UserDataUpdate,
  PaymentHistoryResponse,
  PaymentHistory,
  PaymentRecord,
  TokenBalanceResponse,
  WebhookEvent,
  SubscriptionData,
  AccessStatus
} from '@/types/interfaces/api.types';
import { handleAPIError, APIError } from '../utils/errorUtils';
import { normalizeTimestamp } from '../utils/dateUtils';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Helper function to get Firebase token
const getFirebaseToken = async (): Promise<string> => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new APIError('No user logged in', 401);
  }
  return await currentUser.getIdToken();
};

// Helper function for retrying failed requests
const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> => {
  try {
    return await requestFn();
  } catch (error) {
    if (retries > 0 && error instanceof APIError && typeof error.statusCode === 'number' && error.statusCode >= 500) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return retryRequest(requestFn, retries - 1);
    }
    throw error;
  }
};

// API Functions
export const getUserProfile = async (): Promise<UserProfileData> => {
  return retryRequest(async () => {
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
        return handleAPIError(response);
      }
      
      const data = await response.json();
      return {
        ...data,
        created_at: normalizeTimestamp(data.created_at),
        last_login: normalizeTimestamp(data.last_login)
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  });
};

export const createUserProfile = async (data: UserProfileCreate): Promise<UserProfileData> => {
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

export const updateUserProfile = async (data: UserDataUpdate): Promise<UserProfileData> => {
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

export const getTokenBalance = async (): Promise<TokenBalanceResponse> => {
  try {
    const firebaseToken = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/user/tokens`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch token balance');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching token balance:', error);
    throw error;
  }
};

export const processWebhookEvent = async (event: WebhookEvent): Promise<void> => {
  return retryRequest(async () => {
    try {
      const firebaseToken = await getFirebaseToken();
      const response = await fetch(`${BASE_URL}/api/webhook/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firebaseToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        return handleAPIError(response);
      }
    } catch (error) {
      console.error('Error processing webhook event:', error);
      throw error;
    }
  });
};

export const updateTokenBalance = async (
  amount: number,
  type: string
): Promise<void> => {
  return retryRequest(async () => {
    try {
      const firebaseToken = await getFirebaseToken();
      const response = await fetch(`${BASE_URL}/api/user/tokens/update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firebaseToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, type }),
      });

      if (!response.ok) {
        return handleAPIError(response);
      }
    } catch (error) {
      console.error('Error updating token balance:', error);
      throw error;
    }
  });
};
