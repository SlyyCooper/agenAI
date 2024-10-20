import { createParser, ParsedEvent, ReconnectInterval } from "eventsource-parser";

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

export async function getUserSubscription() {
  const response = await fetch('/user/subscription', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch subscription data');
  }
  return response.json();
}

export async function getUserPaymentHistory() {
  const response = await fetch('/user/payment-history', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch payment history');
  }
  return response.json();
}

export async function cancelUserSubscription() {
  const response = await fetch('/user/cancel-subscription', {
    method: 'POST',
    headers: {
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
  return response.json();
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
  return response.json();
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
