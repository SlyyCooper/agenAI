// Mock Firebase Auth
export const mockAuth = {
  currentUser: {
    uid: 'test-user-id',
    email: 'test@example.com'
  },
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn()
};

// Mock Firebase Storage
export const mockStorage = {
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  listAll: jest.fn(),
  delete: jest.fn()
};

// Mock Firestore
export const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn()
};

// Mock Firebase App
export const mockApp = {
  auth: () => mockAuth,
  storage: () => mockStorage,
  firestore: () => mockFirestore
};

// Mock Firebase functions
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => mockApp),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => mockApp)
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => mockAuth),
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn()
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => mockStorage),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  listAll: jest.fn(),
  deleteObject: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => mockFirestore),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn()
})); 