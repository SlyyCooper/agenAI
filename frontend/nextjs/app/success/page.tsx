'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSubscriptionStatus } from '@/api/stripeAPI';
import type { SubscriptionStatusResponse } from '@/api/stripeAPI';

export default function SuccessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatusResponse | null>(null);

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      try {
        const status = await getSubscriptionStatus();
        setSubscription(status);
        setLoading(false);
        
        // Redirect to dashboard after 5 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 5000);
      } catch (error) {
        console.error('Error checking subscription:', error);
        setLoading(false);
      }
    };

    checkSubscriptionStatus();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {/* Success Icon */}
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Payment Successful!
            </h2>

            {loading ? (
              <p className="mt-2 text-sm text-gray-500">
                Confirming your payment...
              </p>
            ) : subscription ? (
              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  {subscription.subscription_status === 'active' 
                    ? 'Your subscription is now active.'
                    : 'Your one-time purchase is confirmed.'}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  You will be redirected to the dashboard in a few seconds.
                </p>
              </div>
            ) : null}

            {/* Manual Navigation Button */}
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-6 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

