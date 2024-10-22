'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft, HelpCircle, Loader, AlertTriangle } from 'lucide-react';
import { Suspense } from 'react';
import { useAuth } from '@/config/firebase/AuthContext';
import { getUserSubscription, Subscription } from '@/actions/stripeAPI';

function CancelContent() {
  const [status, setStatus] = useState<'loading' | 'cancelled' | 'active' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const searchParams = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!user) {
        setStatus('error');
        setErrorMessage('User not authenticated. Please log in to check your subscription status.');
        return;
      }

      try {
        const token = await user.getIdToken();
        const subscription = await getUserSubscription(token);
        
        if (!subscription) {
          setStatus('cancelled');
        } else if (subscription.status === 'active') {
          setStatus('active');
        } else {
          setStatus('cancelled');
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
        setStatus('error');
        setErrorMessage('Failed to check subscription status. Please try again or contact support.');
      }
    };

    checkSubscriptionStatus();
  }, [user]);

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center">
            <Loader className="w-16 h-16 text-blue-500 animate-spin mb-4" />
            <p className="text-xl">Checking your subscription status...</p>
          </div>
        );
      case 'cancelled':
        return (
          <>
            <XCircle className="w-24 h-24 text-red-500 mx-auto mb-6" />
            <h1 className="text-4xl font-bold mb-4">Subscription Cancelled</h1>
            <p className="text-xl text-gray-600 mb-8">Your subscription has been cancelled or is not active.</p>
          </>
        );
      case 'active':
        return (
          <>
            <AlertTriangle className="w-24 h-24 text-yellow-500 mx-auto mb-6" />
            <h1 className="text-4xl font-bold mb-4">Subscription Active</h1>
            <p className="text-xl text-gray-600 mb-8">Your subscription is still active. If you wish to cancel, please go to your account settings.</p>
          </>
        );
      case 'error':
        return (
          <>
            <XCircle className="w-24 h-24 text-red-500 mx-auto mb-6" />
            <h1 className="text-4xl font-bold mb-4">Error Checking Subscription</h1>
            <p className="text-xl text-gray-600 mb-8">{errorMessage}</p>
          </>
        );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-red-50 to-white text-gray-900">
      <motion.div 
        className="bg-white p-12 rounded-2xl shadow-xl text-center max-w-lg"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 10 }}
        >
          {renderContent()}
        </motion.div>
        <div className="flex flex-col space-y-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Link href="/plans" className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 transition-colors inline-flex items-center justify-center w-full">
              <ArrowLeft className="mr-2 h-5 w-5" /> Return to Plans
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <Link href="/support" className="bg-gray-200 text-gray-800 px-8 py-3 rounded-lg hover:bg-gray-300 transition-colors inline-flex items-center justify-center w-full">
              <HelpCircle className="mr-2 h-5 w-5" /> Contact Support
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default function CancelPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CancelContent />
    </Suspense>
  );
}
