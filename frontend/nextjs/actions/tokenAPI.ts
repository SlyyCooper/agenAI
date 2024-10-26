import { getAuth } from 'firebase/auth';

const BASE_URL = 'https://dolphin-app-49eto.ondigitalocean.app/backend';

// Types
export interface TokenBalance {
  balance: number;
  last_updated?: string;
  subscription_status?: string;
}

export interface TokenHistory {
  amount: number;
  reason: string;
  timestamp: string;
  balance: number;
}

export interface TokenUsageStats {
  total_tokens_purchased: number;
  total_tokens_used: number;
  current_balance: number;
  usage_by_reason: Record<string, number>;
  purchase_history: TokenHistory[];
  usage_history: TokenHistory[];
}

export interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price: number;
  price_id: string;
  description: string;
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

export const consumeTokens = async (amount: number, reason: string): Promise<{
  success: boolean;
  new_balance: number;
  amount_consumed: number;
  reason: string;
}> => {
  try {
    const firebaseToken = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/tokens/consume`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount, reason }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to consume tokens');
    }

    return await response.json();
  } catch (error) {
    console.error('Error consuming tokens:', error);
    throw error;
  }
};

export const getTokenHistory = async (): Promise<{
  history: TokenHistory[];
  current_balance: number;
}> => {
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

export const getTokenPackages = async (): Promise<{
  packages: TokenPackage[];
}> => {
  try {
    const response = await fetch(`${BASE_URL}/api/tokens/packages`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get token packages');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting token packages:', error);
    throw error;
  }
};

export const getTokenUsageStats = async (): Promise<TokenUsageStats> => {
  try {
    const firebaseToken = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/tokens/usage-stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get token usage stats');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting token usage stats:', error);
    throw error;
  }
};
