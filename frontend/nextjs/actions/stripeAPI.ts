import { loadStripe } from '@stripe/stripe-js';
import { getAuth } from 'firebase/auth';

const BASE_URL = 'https://dolphin-app-49eto.ondigitalocean.app/backend';

// Types
interface CreateCheckoutSessionRequest {
  price_id: string;
  mode: 'subscription' | 'payment';
}

export interface SubscriptionStatusResponse {
  has_access: boolean;
  subscription_status?: string;
  subscription_end_date?: string;
  subscription_id?: string;
  one_time_purchase: boolean;
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
export const createCheckoutSession = async (
  price_id: string,
  mode: 'subscription' | 'payment'
): Promise<void> => {
  try {
    const firebaseToken = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        price_id: price_id,
        mode: mode 
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to create checkout session');
    }
    
    const { sessionId } = await response.json();
    const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
    
    if (!stripe) throw new Error('Stripe failed to load');
    
    const { error } = await stripe.redirectToCheckout({ sessionId });
    if (error) throw error;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

export const createPortalSession = async (): Promise<void> => {
  try {
    const firebaseToken = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/stripe/create-portal-session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) throw new Error('Failed to create portal session');
    
    const { url } = await response.json();
    window.location.href = url;
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
};

export const cancelSubscription = async (): Promise<any> => {
  try {
    const firebaseToken = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/stripe/cancel-subscription`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) throw new Error('Failed to cancel subscription');
    return await response.json();
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
};

export const getSubscriptionStatus = async (): Promise<SubscriptionStatusResponse> => {
  try {
    console.log('Fetching subscription status...');
    const firebaseToken = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/stripe/subscription-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('Subscription status API error:', await response.text());
      throw new Error('Failed to fetch subscription status');
    }
    
    const data = await response.json();
    console.log('Subscription status fetched:', data);
    return data;
  } catch (error) {
    console.error('Subscription status fetch error:', error);
    throw error;
  }
};

export const getProducts = async () => {
  try {
    console.log('Fetching products...');
    const response = await fetch(`${BASE_URL}/api/stripe/products`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('Products API error:', await response.text());
      throw new Error('Failed to fetch products');
    }
    
    const data = await response.json();
    console.log('Products fetched:', data);
    return data;
  } catch (error) {
    console.error('Products fetch error:', error);
    throw error;
  }
};
