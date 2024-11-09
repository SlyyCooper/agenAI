'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Import API functions from their respective files
import { getSubscriptionStatus } from '@/api/stripeAPI';
import { getAccessStatus } from '@/api/userprofileAPI';

// Import types from models
import type { 
  SubscriptionStatusResponse, 
  AccessStatus 
} from '@/api/types/models';

export default function SuccessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatusResponse | null>(null);
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Get both subscription and access status
        const [subStatus, access] = await Promise.all([
          getSubscriptionStatus(),
          getAccessStatus()
        ]);
        
        setSubscription(subStatus);
        setAccessStatus(access);
        setLoading(false);
        
        // Redirect to dashboard after 5 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 5000);
      } catch (error) {
        console.error('Error checking status:', error);
        setLoading(false);
      }
    };

    checkStatus();
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
            ) : subscription && accessStatus ? (
              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  {accessStatus.access_type === 'subscription' 
                    ? 'Your subscription is now active.'
                    : 'Your one-time purchase is confirmed.'}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  You will be redirected to the dashboard in a few seconds.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

