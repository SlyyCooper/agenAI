import { createParser, ParsedEvent, ReconnectInterval } from "eventsource-parser";
import { getAuth } from 'firebase/auth';

const BASE_URL = 'https://dolphin-app-49eto.ondigitalocean.app/backend';

// Helper function to get Firebase token (same as in other APIs)
const getFirebaseToken = async (): Promise<string> => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('No user logged in');
  }
  return await currentUser.getIdToken();
};

export async function handleSourcesAndAnswer(question: string) {
  try {
    const firebaseToken = await getFirebaseToken();
    
    let sourcesResponse = await fetch(`${BASE_URL}/api/getSources`, {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ question }),
    });

    if (!sourcesResponse.ok) {
      const error = await sourcesResponse.json();
      throw new Error(error.detail || 'Failed to get sources');
    }
    
    let sources = await sourcesResponse.json();

    const response = await fetch(`${BASE_URL}/api/getAnswer`, {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
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
  } catch (error) {
    console.error('Error in handleSourcesAndAnswer:', error);
    throw error;
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
