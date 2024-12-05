'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Import API functions
import { getSubscriptionStatus } from '@/api/stripeAPI';
import { getAccessStatus } from '@/api/userprofileAPI';

// Import types
import type { SubscriptionStatusResponse, AccessStatus } from '@/types/interfaces/api.types';

export default function SuccessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatusResponse | null>(null);
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const [subStatus, access] = await Promise.all([
          getSubscriptionStatus(),
          getAccessStatus()
        ]);
        
        setSubscription(subStatus);
        setAccessStatus(access);
        setLoading(false);
        
        toast.success('Payment processed successfully!');

        // Redirect after delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 5000);
      } catch (error) {
        console.error('Error:', error);
        setLoading(false);
        toast.error('Error confirming payment status');
      }
    };

    checkStatus();
  }, [router]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col justify-center py-12 sm:px-6 lg:px-8"
    >
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div 
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 border border-gray-100"
        >
          <div className="text-center">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100"
            >
              <CheckCircle className="h-8 w-8 text-green-600" />
            </motion.div>

            <motion.h2 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 text-3xl font-extrabold text-gray-900"
            >
              Payment Successful!
            </motion.h2>

            {loading ? (
              <motion.div
                animate={{ opacity: [0.5, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="mt-4"
              >
                <p className="text-sm text-gray-500">Confirming your payment...</p>
              </motion.div>
            ) : subscription && accessStatus ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-4 space-y-4"
              >
                <p className="text-sm text-gray-600">
                  {accessStatus.access_type === 'subscription' 
                    ? 'Your subscription is now active.'
                    : 'Your one-time purchase is confirmed.'}
                </p>
                <p className="text-sm text-gray-500">
                  Redirecting to dashboard in a few seconds...
                </p>

                <div className="mt-8 space-y-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push('/research')}
                    className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Search className="mr-2 h-5 w-5" />
                    Start Researching
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push('/dashboard')}
                    className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </motion.button>
                </div>
              </motion.div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

