'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useAuth } from '@/config/firebase/AuthContext';
import { verifyPayment } from '@/actions/apiActions';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Loader } from 'lucide-react';
import Link from 'next/link';

function SuccessContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'unpaid' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const searchParams = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    const checkPayment = async () => {
      const sessionId = searchParams.get('session_id');
      if (!sessionId) {
        setStatus('error');
        setErrorMessage('No session ID found. Please try your purchase again.');
        return;
      }
      if (!user) {
        setStatus('error');
        setErrorMessage('User not authenticated. Please log in and try again.');
        return;
      }

      try {
        const token = await user.getIdToken();
        const result = await verifyPayment(token, sessionId);
        if (result.status === 'paid') {
          setStatus('success');
        } else if (result.status === 'unpaid') {
          setStatus('unpaid');
        } else {
          setStatus('error');
          setErrorMessage('An unexpected error occurred. Please contact support.');
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        setStatus('error');
        setErrorMessage('Failed to verify payment. Please try again or contact support.');
      }
    };

    checkPayment();
  }, [searchParams, user]);

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
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-4">Thank you for your purchase!</h1>
            <p className="text-xl mb-8">Your payment was successful and your account has been updated.</p>
            <Link href="/dashboard" className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors">
              Go to Dashboard
            </Link>
          </div>
        );
      case 'unpaid':
        return (
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-4">Payment Incomplete</h1>
            <p className="text-xl mb-8">Your payment has not been completed. Please try again or contact support if you believe this is an error.</p>
            <Link href="/plans" className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors">
              Return to Plans
            </Link>
          </div>
        );
      case 'error':
        return (
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-4">Oops! Something went wrong</h1>
            <p className="text-xl mb-8">{errorMessage}</p>
            <div className="space-y-4">
              <Link href="/plans" className="block bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors">
                Try Again
              </Link>
              <Link href="/support" className="block bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors">
                Contact Support
              </Link>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <motion.div 
        className="bg-white p-12 rounded-2xl shadow-xl max-w-md w-full"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {renderContent()}
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

