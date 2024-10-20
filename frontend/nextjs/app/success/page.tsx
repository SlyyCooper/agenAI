'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/config/firebase/AuthContext';
import axios from 'axios';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function SuccessContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const searchParams = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      if (sessionId && user) {
        try {
          const response = await axios.get(`https://dolphin-app-49eto.ondigitalocean.app/backend/verify-payment/${sessionId}`, {
            headers: { Authorization: `Bearer ${await user.getIdToken()}` }
          });
          if (response.data.status === 'paid') {
            setStatus('success');
          } else {
            setStatus('error');
          }
        } catch (error) {
          console.error('Error verifying payment:', error);
          setStatus('error');
        }
      }
    };

    verifyPayment();
  }, [searchParams, user]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <motion.div
          className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Oops! Something went wrong</h1>
          <p className="text-gray-600 mb-6">We couldn&apos;t verify your payment. Please contact our support team for assistance.</p>
          <Link href="/support" className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors inline-flex items-center">
            Contact Support <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white text-gray-900">
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
          <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
        </motion.div>
        <h1 className="text-4xl font-bold mb-4">Thank You!</h1>
        <p className="text-xl text-gray-600 mb-8">Your payment was successful and your account has been updated.</p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Link href="/dashboard" className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 transition-colors inline-flex items-center">
            Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function SuccessPage() {
  return <SuccessContent />;
}
