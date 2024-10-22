export interface Subscription {
  id: string;
  status: string;
  plan?: string; // Make this optional as it might not always be present
  current_period_end: number;
  cancel_at_period_end: boolean;
}

export async function getUserSubscription(token: string): Promise<Subscription | null> {
  const response = await fetch('https://dolphin-app-49eto.ondigitalocean.app/backend/user-subscription', {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  });
  if (!response.ok) {
    if (response.status === 404) {
      return null; // User has no subscription
    }
    throw new Error('Failed to fetch subscription data');
  }
  return response.json();
}

export async function getUserPaymentHistory(token: string) {
  const response = await fetch('https://dolphin-app-49eto.ondigitalocean.app/backend/user/payment-history', {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch payment history');
  }
  return response.json();
}

export async function cancelUserSubscription(token: string) {
  const response = await fetch('https://dolphin-app-49eto.ondigitalocean.app/backend/user/cancel-subscription', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to cancel subscription');
  }
  return response.json();
}

export async function createCheckoutSession(token: string, mode: 'payment' | 'subscription') {
  const response = await fetch('https://dolphin-app-49eto.ondigitalocean.app/backend/create-checkout-session', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Origin': window.location.origin,
    },
    body: JSON.stringify({ mode }),
  });
  if (!response.ok) {
    throw new Error('Failed to create checkout session');
  }
  const data = await response.json();
  return data.id;
}

export async function getUserPayments(token: string, limit: number = 10) {
  const response = await fetch(`https://dolphin-app-49eto.ondigitalocean.app/backend/user-payments?limit=${limit}`, {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch user payments');
  }
  return response.json();
}

export async function handleStripeWebhook(body: string, signature: string) {
  const response = await fetch('https://dolphin-app-49eto.ondigitalocean.app/backend/stripe-webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': signature,
    },
    body: body,
  });
  if (!response.ok) {
    throw new Error('Failed to handle Stripe webhook');
  }
  return response.json();
}
