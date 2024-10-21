'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft, HelpCircle, Loader, AlertTriangle } from 'lucide-react';
import { Suspense } from 'react';
import { useAuth } from '@/config/firebase/AuthContext';
import { cancelPayment } from '@/actions/apiActions';

function CancelContent() {
  const [status, setStatus] = useState<'loading' | 'cancelled' | 'already_paid' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const searchParams = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    const handleCancellation = async () => {
      const sessionId = searchParams.get('session_id');
      if (!sessionId) {
        setStatus('error');
        setErrorMessage('No session ID found. Unable to process cancellation.');
        return;
      }
      if (!user) {
        setStatus('error');
        setErrorMessage('User not authenticated. Please log in to cancel your payment.');
        return;
      }

      try {
        const token = await user.getIdToken();
        const result = await cancelPayment(token, sessionId);
        if (result.status === 'cancelled') {
          setStatus('cancelled');
        } else if (result.status === 'already_paid') {
          setStatus('already_paid');
        } else {
          setStatus('error');
          setErrorMessage('An unexpected error occurred. Please contact support.');
        }
      } catch (error) {
        console.error('Error cancelling payment:', error);
        setStatus('error');
        setErrorMessage('Failed to cancel payment. Please try again or contact support.');
      }
    };

    handleCancellation();
  }, [searchParams, user]);

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center">
            <Loader className="w-16 h-16 text-blue-500 animate-spin mb-4" />
            <p className="text-xl">Processing your cancellation request...</p>
          </div>
        );
      case 'cancelled':
        return (
          <>
            <XCircle className="w-24 h-24 text-red-500 mx-auto mb-6" />
            <h1 className="text-4xl font-bold mb-4">Payment Cancelled</h1>
            <p className="text-xl text-gray-600 mb-8">Your payment was successfully cancelled.</p>
          </>
        );
      case 'already_paid':
        return (
          <>
            <AlertTriangle className="w-24 h-24 text-yellow-500 mx-auto mb-6" />
            <h1 className="text-4xl font-bold mb-4">Payment Already Processed</h1>
            <p className="text-xl text-gray-600 mb-8">Your payment has already been processed and cannot be cancelled.</p>
          </>
        );
      case 'error':
        return (
          <>
            <XCircle className="w-24 h-24 text-red-500 mx-auto mb-6" />
            <h1 className="text-4xl font-bold mb-4">Error Cancelling Payment</h1>
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
