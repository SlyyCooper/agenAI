import axios from 'axios';
import { auth } from './firebase';

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Helper function to get the token and set headers
const getAuthHeaders = async () => {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error('User not authenticated');
  }
  return { headers: { Authorization: `Bearer ${token}` } };
};

// User profile operations
export const createUserProfile = async (userId: string, data: any) => {
  const headers = await getAuthHeaders();
  return axios.post(`${API_URL}/api/user_profile`, { uid: userId, ...data }, headers);
};

export const getUserProfile = async (userId: string) => {
  const headers = await getAuthHeaders();
  return axios.get(`${API_URL}/api/user_profile/${userId}`, headers);
};

export const updateUserProfile = async (userId: string, data: any) => {
  const headers = await getAuthHeaders();
  return axios.put(`${API_URL}/api/user_profile/${userId}`, data, headers);
};

// Subscription operations
export const createSubscription = async (userId: string, subscriptionData: any) => {
  const headers = await getAuthHeaders();
  return axios.post(`${API_URL}/api/subscription`, { userId, ...subscriptionData }, headers);
};

export const getSubscription = async (userId: string) => {
  const headers = await getAuthHeaders();
  return axios.get(`${API_URL}/api/subscription/${userId}`, headers);
};

export const updateSubscription = async (userId: string, subscriptionData: any) => {
  const headers = await getAuthHeaders();
  return axios.put(`${API_URL}/api/subscription/${userId}`, subscriptionData, headers);
};

// Report operations
export const createReport = async (userId: string, reportData: any) => {
  const headers = await getAuthHeaders();
  return axios.post(`${API_URL}/api/report`, { userId, ...reportData }, headers);
};

export const getReports = async (userId: string) => {
  const headers = await getAuthHeaders();
  const response = await axios.get(`${API_URL}/api/reports/${userId}`, headers);
  return response.data; // Return the data directly
};

export const deleteReport = async (userId: string, reportId: string) => {
  const headers = await getAuthHeaders();
  return axios.delete(`${API_URL}/api/report/${userId}/${reportId}`, headers);
};

// WebSocket connection
const socket = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws`);

socket.onopen = async () => {
  const token = await auth.currentUser?.getIdToken();
  if (token) {
    socket.send(JSON.stringify({ type: 'auth', token }));
  } else {
    console.error('No token available');
    socket.close();
  }
};

export const createCheckoutSession = async (plan: string, amount: number) => {
  const headers = await getAuthHeaders();
  const success_url = `${window.location.origin}/success`;
  const cancel_url = `${window.location.origin}/cancel`;
  return axios.post(`${API_URL}/api/checkout_sessions`, { plan, amount, success_url, cancel_url }, headers);
};

export const getCheckoutSession = async (sessionId: string) => {
  const headers = await getAuthHeaders();
  return axios.get(`${API_URL}/api/checkout_sessions/${sessionId}`, headers);
};

export const createPaymentIntent = async (amount: number) => {
  const headers = await getAuthHeaders();
  return axios.post(`${API_URL}/api/payment_intents`, { amount }, headers);
};

export const handleStripeWebhook = async (body: string, signature: string) => {
  return axios.post(`${API_URL}/api/stripe_hook`, body, {
    headers: { 'stripe-signature': signature }
  });
};
