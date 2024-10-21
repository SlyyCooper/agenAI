import { createParser, ParsedEvent, ReconnectInterval } from "eventsource-parser";

export interface Subscription {
  id: string;
  status: string;
  plan: string;
  current_period_end: number;
  cancel_at_period_end: boolean;
}

export async function handleSourcesAndAnswer(question: string) {
  let sourcesResponse = await fetch("/api/getSources", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
  let sources = await sourcesResponse.json();

  const response = await fetch("/api/getAnswer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question, sources }),
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  if (response.status === 202) {
    const fullAnswer = await response.text();
    return fullAnswer;
  }

  // This data is a ReadableStream
  const data = response.body;
  if (!data) {
    return;
  }

  const onParse = (event: ParsedEvent | ReconnectInterval) => {
    if (event.type === "event") {
      const data = event.data;
      try {
        const text = JSON.parse(data).text ?? "";
        return text;
      } catch (e) {
        console.error(e);
      }
    }
  };

  // https://web.dev/streams/#the-getreader-and-read-methods
  const reader = data.getReader();
  const decoder = new TextDecoder();
  const parser = createParser(onParse);
  let done = false;
  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    const chunkValue = decoder.decode(value);
    parser.feed(chunkValue);
  }
}

export async function handleSimilarQuestions(question: string) {
  let res = await fetch("/api/getSimilarQuestions", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
  let questions = await res.json();
  return questions;
}

export async function handleLanggraphAnswer(question: string) {
  const response = await fetch("/api/generateLanggraph", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  // This data is a ReadableStream
  const data = response.body;
  if (!data) {
    return;
  }

  const onParse = (event: ParsedEvent | ReconnectInterval) => {
    if (event.type === "event") {
      const data = event.data;
      try {
        const text = JSON.parse(data).text ?? "";
        return text;
      } catch (e) {
        console.error(e);
      }
    }
  };

  const reader = data.getReader();
  const decoder = new TextDecoder();
  const parser = createParser(onParse);
  let done = false;
  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    const chunkValue = decoder.decode(value);
    parser.feed(chunkValue);
  }
}

export async function getUserSubscription(token: string): Promise<Subscription | null> {
  const response = await fetch('https://dolphin-app-49eto.ondigitalocean.app/backend/user/subscription', {
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

export async function createStripeCustomer(token: string) {
  const response = await fetch('https://dolphin-app-49eto.ondigitalocean.app/backend/create-stripe-customer', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to create Stripe customer');
  }
  const data = await response.json();
  return data.customer_id;
}

export async function createPaymentIntent(token: string, amount: number, currency: string) {
  const response = await fetch('https://dolphin-app-49eto.ondigitalocean.app/backend/create-payment-intent', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount, currency }),
  });
  if (!response.ok) {
    throw new Error('Failed to create payment intent');
  }
  const data = await response.json();
  return { clientSecret: data.client_secret, sessionId: data.session_id };
}

export async function createSubscription(token: string, priceId: string) {
  const response = await fetch('https://dolphin-app-49eto.ondigitalocean.app/backend/create-subscription', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ price_id: priceId }),
  });
  if (!response.ok) {
    throw new Error('Failed to create subscription');
  }
  const data = await response.json();
  return { clientSecret: data.client_secret, sessionId: data.session_id };
}

export async function getUserProfile(token: string) {
  const response = await fetch('https://dolphin-app-49eto.ondigitalocean.app/backend/user/profile', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }
  return response.json();
}

export async function getUserReports(token: string) {
  const response = await fetch('https://dolphin-app-49eto.ondigitalocean.app/backend/user/reports', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch user reports');
  }
  return response.json();
}

export async function verifyPayment(token: string, sessionId: string): Promise<{ status: 'paid' | 'unpaid' | 'error' }> {
  const response = await fetch(`https://dolphin-app-49eto.ondigitalocean.app/backend/verify-payment/${sessionId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to verify payment');
  }
  const data = await response.json();
  return { status: data.status };
}

export async function cancelPayment(token: string, sessionId: string): Promise<{ status: 'cancelled' | 'already_paid' | 'error' }> {
  const response = await fetch(`https://dolphin-app-49eto.ondigitalocean.app/backend/cancel-payment/${sessionId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to cancel payment');
  }
  const data = await response.json();
  return { status: data.status };
}

export async function getCheckoutSession(token: string, sessionId: string) {
  const response = await fetch(`https://dolphin-app-49eto.ondigitalocean.app/backend/checkout-sessions/${sessionId}`, {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  });
  if (!response.ok) {
    throw new Error('Failed to retrieve checkout session');
  }
  return response.json();
}

export async function createCheckoutSession(token: string, priceId: string) {
  const response = await fetch('https://dolphin-app-49eto.ondigitalocean.app/backend/create-checkout-session', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Origin': window.location.origin,
    },
    body: JSON.stringify({ price_id: priceId }),
  });
  if (!response.ok) {
    throw new Error('Failed to create checkout session');
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
