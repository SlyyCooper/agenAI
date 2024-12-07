// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'
import './__tests__/mocks/firebase'
import './__tests__/mocks/axios'

// Mock URL constructor
global.URL = class URL {
  constructor(url) {
    return {
      href: url,
      origin: 'http://localhost:3000',
      protocol: 'http:',
      host: 'localhost:3000',
      hostname: 'localhost',
      port: '3000',
      pathname: '/',
      search: '',
      hash: ''
    };
  }
};

// Mock window.URL
const mockCreateObjectURL = jest.fn()
const mockRevokeObjectURL = jest.fn()

Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL
  }
})

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = jest.fn()
  disconnect = jest.fn()
  unobserve = jest.fn()
}

Object.defineProperty(window, 'IntersectionObserver', {
  value: MockIntersectionObserver
})

// Mock ResizeObserver
class MockResizeObserver {
  observe = jest.fn()
  disconnect = jest.fn()
  unobserve = jest.fn()
}

Object.defineProperty(window, 'ResizeObserver', {
  value: MockResizeObserver
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }))
})

// Mock scrollTo
window.scrollTo = jest.fn()

// Mock process.env
process.env = {
  ...process.env,
  NEXT_PUBLIC_FIREBASE_API_KEY: 'mock-api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'mock-auth-domain',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'mock-project-id',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'mock-storage-bucket',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'mock-sender-id',
  NEXT_PUBLIC_FIREBASE_APP_ID: 'mock-app-id',
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: 'mock-measurement-id'
} 