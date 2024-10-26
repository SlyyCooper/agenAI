import { getAuth } from 'firebase/auth';

const BASE_URL = 'https://dolphin-app-49eto.ondigitalocean.app/backend';

// Types
export interface TokenBalance {
  balance: number;
}

export interface TokenHistory {
  history: Array<{
    amount: number;
    type: string;
    timestamp: string;
  }>;
}

export interface TokenUseResponse {
  status: string;
  amount: number;
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
export const getTokenBalance = async (): Promise<TokenBalance> => {
  try {
    const firebaseToken = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/tokens/balance`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get token balance');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting token balance:', error);
    throw error;
  }
};

export const getTokenHistory = async (): Promise<TokenHistory> => {
  try {
    const firebaseToken = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/tokens/history`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get token history');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting token history:', error);
    throw error;
  }
};

export const useTokens = async (amount: number): Promise<TokenUseResponse> => {
  try {
    const firebaseToken = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/tokens/use`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to use tokens');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error using tokens:', error);
    throw error;
  }
};
