'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowLeft, HelpCircle, Loader } from 'lucide-react';
import { Suspense } from 'react';
import { useAuth } from '@/config/firebase/AuthContext';
import { getUserSubscription, getUserPayments } from '@/actions/stripeAPI';

function SuccessContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const searchParams = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!user) {
        setStatus('error');
        setErrorMessage('User not authenticated. Please log in to view payment details.');
        return;
      }

      try {
        const token = await user.getIdToken();
        const subscription = await getUserSubscription(token);
        const payments = await getUserPayments(token, 1); // Get the most recent payment

        if (subscription || (payments && payments.length > 0)) {
          setStatus('success');
          setPaymentDetails(subscription || payments[0]);
        } else {
          setStatus('error');
          setErrorMessage('No recent payment or subscription found.');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus('error');
        setErrorMessage('Failed to verify payment. Please contact support if the issue persists.');
      }
    };

    checkPaymentStatus();
  }, [user]);

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center">
            <Loader className="w-16 h-16 text-blue-500 animate-spin mb-4" />
            <p className="text-xl">Verifying your payment...</p>
          </div>
        );
      case 'success':
        return (
          <>
            <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
            <h1 className="text-4xl font-bold mb-4">Payment Successful!</h1>
            <p className="text-xl text-gray-600 mb-8">Thank you for your purchase.</p>
            {paymentDetails && (
              <div className="bg-gray-100 p-4 rounded-lg mb-8">
                <h2 className="text-2xl font-semibold mb-2">Payment Details</h2>
                {paymentDetails.status && (
                  <p>Subscription Status: {paymentDetails.status}</p>
                )}
                {paymentDetails.amount && (
                  <p>Amount: ${(paymentDetails.amount / 100).toFixed(2)} {paymentDetails.currency}</p>
                )}
                {paymentDetails.date && (
                  <p>Date: {new Date(paymentDetails.date).toLocaleDateString()}</p>
                )}
              </div>
            )}
          </>
        );
      case 'error':
        return (
          <>
            <CheckCircle className="w-24 h-24 text-red-500 mx-auto mb-6" />
            <h1 className="text-4xl font-bold mb-4">Payment Verification Error</h1>
            <p className="text-xl text-gray-600 mb-8">{errorMessage}</p>
          </>
        );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-green-50 to-white text-gray-900">
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
            <Link href="/dashboard" className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 transition-colors inline-flex items-center justify-center w-full">
              <ArrowLeft className="mr-2 h-5 w-5" /> Go to Dashboard
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

export default function SuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
