'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/config/firebase/AuthContext';
import { Stripe } from 'stripe';
import getStripe from '@/config/stripe/get-stripejs';

const DashboardPage: React.FC = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('Fetching...');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }

    const fetchSubscriptionStatus = async () => {
      if (user) {
        try {
          const res = await fetch('/api/subscription_status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: user.uid }),
          });
          const data = await res.json();
          setSubscriptionStatus(data.status || 'No Subscription');
        } catch (error) {
          console.error('Error fetching subscription status:', error);
          setSubscriptionStatus('Error fetching status');
        }
      }
    };

    fetchSubscriptionStatus();
  }, [user, loading, router]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold gradient-text mb-6">Welcome to your Dashboard</h1>
      <div className="card">
        <p className="text-custom-secondary mb-4">
          Subscription Status: <span className="text-custom-primary">{subscriptionStatus}</span>
        </p>
        {/* Add more personalized dashboard content here */}
      </div>
    </div>
  );
};

export default DashboardPage;
