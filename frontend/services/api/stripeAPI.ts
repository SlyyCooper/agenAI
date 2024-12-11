import { loadStripe } from '@stripe/stripe-js';
import { getAuth } from 'firebase/auth';
import {
  CheckoutSessionRequest,
  SubscriptionStatusResponse,
  ProductsResponse,
  CancelSubscriptionResponse
} from '@/types/interfaces/api.types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!STRIPE_KEY) {
  throw new Error('Stripe publishable key is not configured');
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

// Helper function to handle API errors
const handleApiError = (error: any): never => {
  console.error('API Error:', error);
  if (error.response?.data?.detail) {
    throw new Error(error.response.data.detail);
  }
  throw error;
};

// API Functions
export const createCheckoutSession = async (
  price_id: string,
  mode: 'subscription' | 'payment'
): Promise<void> => {
  if (!price_id) {
    throw new Error('Price ID is required');
  }
  
  try {
    console.log('Getting Firebase token...');
    const firebaseToken = await getFirebaseToken();
    
    console.log('Creating checkout session...', { price_id, mode });
    const checkoutData: CheckoutSessionRequest = { price_id, mode };
    
    const response = await fetch(`${BASE_URL}/api/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create checkout session');
    }
    
    const { sessionId } = await response.json();
    console.log('Got session ID:', sessionId);
    
    const stripe = await loadStripe(STRIPE_KEY);
    if (!stripe) {
      throw new Error('Failed to initialize Stripe');
    }
    
    const { error } = await stripe.redirectToCheckout({ sessionId });
    if (error) {
      console.error('Stripe redirect error:', error);
      throw error;
    }
  } catch (error) {
    handleApiError(error);
  }
};

export const createPortalSession = async (): Promise<string> => {
  try {
    const firebaseToken = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/stripe/create-portal-session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create portal session');
    }
    
    const { url } = await response.json();
    return url;
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
};

export const cancelSubscription = async (): Promise<CancelSubscriptionResponse> => {
  try {
    const firebaseToken = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/stripe/cancel-subscription`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to cancel subscription');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
};

export const getSubscriptionStatus = async (): Promise<SubscriptionStatusResponse> => {
  try {
    console.log('Getting Firebase token...');
    const firebaseToken = await getFirebaseToken();
    
    console.log('Fetching subscription status...');
    const response = await fetch(`${BASE_URL}/api/stripe/subscription-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch subscription status');
    }
    
    const data = await response.json();
    console.log('Got subscription status:', data);
    
    return {
      ...data,
      tokens: data.tokens || 0
    };
  } catch (error) {
    console.error('API Error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch subscription status');
  }
};

export const getProducts = async (): Promise<ProductsResponse> => {
  try {
    const response = await fetch(`${BASE_URL}/api/stripe/products`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch products');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};
