'use client'; // This directive indicates that this is a client-side component

// Import necessary dependencies
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/config/firebase/AuthContext';
import { getSubscription } from '@/config/firebase/backendService';

// Define the DashboardPage component
const DashboardPage: React.FC = () => {
  // Use the useAuth hook to get user and loading state
  const { user, loading } = useAuth();
  // Initialize the router for navigation
  const router = useRouter();
  // State to hold the user's subscription status
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('Fetching...');

  // useEffect hook to handle side effects
  useEffect(() => {
    // If not loading and no user is logged in, redirect to login page
    if (!loading && !user) {
      router.push('/login');
    }

    // Function to fetch the user's subscription status
    const fetchSubscriptionStatus = async () => {
      if (user) {
        try {
          // Call the backend service to get subscription info
          const res = await getSubscription(user.uid);
          // Update the subscription status state
          setSubscriptionStatus(res.data.status || 'No Subscription');
        } catch (error) {
          console.error('Error fetching subscription status:', error);
          setSubscriptionStatus('Error fetching status');
        }
      }
    };

    // Call the function to fetch subscription status
    fetchSubscriptionStatus();
  }, [user, loading, router]); // Dependencies for the useEffect hook

  // If still loading, show a loading message
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  // Render the dashboard content
  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold gradient-text mb-6">Welcome to your Dashboard</h1>
      <div className="card">
        <p className="text-custom-secondary mb-4">
          Subscription Status: <span className="text-custom-primary">{subscriptionStatus}</span>
        </p>
        {/* Placeholder for additional dashboard content */}
      </div>
    </div>
  );
};

export default DashboardPage;
