// Import necessary dependencies
import axios from 'axios';
import { auth } from './firebase'; // Importing auth from firebase.ts

// Get the API URL from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Helper function to get the authentication token and set headers
// This function uses the Firebase auth instance from firebase.ts
const getAuthHeaders = async () => {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error('User not authenticated');
  }
  return { headers: { Authorization: `Bearer ${token}` } };
};

// User profile operations
// These functions interact with the backend API to manage user profiles
// They are used in AuthContext.tsx to fetch and update user profiles

// Create a new user profile
export const createUserProfile = async (uid: string, userData: any) => {
  const idToken = await auth.currentUser?.getIdToken();
  const response = await fetch(`${API_URL}/api/user_profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({ uid, ...userData }),
  });

  if (!response.ok) {
    throw new Error('Failed to create user profile');
  }

  return response.json();
};

// Get a user's profile
// Used in AuthContext.tsx to fetch the user's profile on authentication
export const getUserProfile = async (userId: string) => {
  const headers = await getAuthHeaders();
  return axios.get(`${API_URL}/api/user_profile/${userId}`, headers);
};

// Update a user's profile
// Can be used to update user information in AuthContext.tsx
export const updateUserProfile = async (userId: string, data: any) => {
  const headers = await getAuthHeaders();
  return axios.put(`${API_URL}/api/user_profile/${userId}`, data, headers);
};

// Subscription operations
// These functions manage user subscriptions

// Create a new subscription for a user
export const createSubscription = async (userId: string, subscriptionData: any) => {
  const headers = await getAuthHeaders();
  return axios.post(`${API_URL}/api/subscription`, { userId, ...subscriptionData }, headers);
};

// Get a user's subscription
export const getSubscription = async (userId: string) => {
  const headers = await getAuthHeaders();
  return axios.get(`${API_URL}/api/subscription/${userId}`, headers);
};

// Update a user's subscription
export const updateSubscription = async (userId: string, subscriptionData: any) => {
  const headers = await getAuthHeaders();
  return axios.put(`${API_URL}/api/subscription/${userId}`, subscriptionData, headers);
};

// Report operations
// These functions manage user reports

// Create a new report for a user
export const createReport = async (userId: string, reportData: any) => {
  const headers = await getAuthHeaders();
  return axios.post(`${API_URL}/api/report`, { userId, ...reportData }, headers);
};

// Get all reports for a user
export const getReports = async (userId: string) => {
  const headers = await getAuthHeaders();
  const response = await axios.get(`${API_URL}/api/reports/${userId}`, headers);
  return response.data; // Return the data directly
};

// Delete a specific report for a user
export const deleteReport = async (userId: string, reportId: string) => {
  const headers = await getAuthHeaders();
  return axios.delete(`${API_URL}/api/report/${userId}/${reportId}`, headers);
};

// WebSocket connection
// This establishes a WebSocket connection for real-time communication
const socket = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws`);

// When the WebSocket connection is opened
socket.onopen = async () => {
  const token = await auth.currentUser?.getIdToken();
  if (token) {
    // Send authentication message
    socket.send(JSON.stringify({ type: 'auth', token }));
  } else {
    console.error('No token available');
    socket.close();
  }
};

// Payment operations
// These functions interact with Stripe for payment processing
// They work in conjunction with get-stripejs.ts

// Create a checkout session for Stripe
export const createCheckoutSession = async (plan: string, amount: number) => {
  const headers = await getAuthHeaders();
  const success_url = `${window.location.origin}/success`;
  const cancel_url = `${window.location.origin}/cancel`;
  const response = await axios.post(`${API_URL}/api/checkout_sessions`, { plan, amount, success_url, cancel_url }, headers);
  return response.data;
};

// Get details of a checkout session
export const getCheckoutSession = async (sessionId: string) => {
  const headers = await getAuthHeaders();
  const response = await axios.get(`${API_URL}/api/checkout_sessions/${sessionId}`, headers);
  return response.data;
};

// Create a payment intent for Stripe
export const createPaymentIntent = async (amount: number) => {
  const headers = await getAuthHeaders();
  return axios.post(`${API_URL}/api/payment_intents`, { amount }, headers);
};

// Handle Stripe webhook events
export const handleStripeWebhook = async (body: string, signature: string) => {
  return axios.post(`${API_URL}/api/stripe_hook`, body, {
    headers: { 'stripe-signature': signature }
  });
};

// Note: This file serves as a bridge between the frontend and backend
// It uses the Firebase auth from firebase.ts for authentication
// The user profile functions are used in AuthContext.tsx to manage user data
// The payment functions work with Stripe, which is initialized in get-stripejs.ts
// All these functions ensure secure, authenticated communication with the backend API
