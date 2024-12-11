import { createParser, ParsedEvent, ReconnectInterval } from "eventsource-parser";
import { ReportDocument } from '@/types/interfaces/api.types';
import { getHost } from '@/helpers/getHost';

export async function handleSourcesAndAnswer(question: string) {
  const { backendUrl } = getHost();
  const apiBase = `${backendUrl}/backend/api`;
  
  let sourcesResponse = await fetch(`${apiBase}/sources`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });
  let sources = await sourcesResponse.json();

  const response = await fetch(`${apiBase}/answer`, {
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
  const { backendUrl } = getHost();
  const apiBase = `${backendUrl}/backend/api`;
  
  let res = await fetch(`${apiBase}/similar-questions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });
  let questions = await res.json();
  return questions;
}

export async function handleLanggraphAnswer(question: string) {
  const { backendUrl } = getHost();
  const apiBase = `${backendUrl}/backend/api`;
  
  const response = await fetch(`${apiBase}/langgraph`, {
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