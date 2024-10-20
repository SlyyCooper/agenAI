'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useAuth } from '@/config/firebase/AuthContext';
import axios from 'axios';

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
    return <div>Verifying payment...</div>;
  }

  if (status === 'error') {
    return <div>An error occurred. Please contact support.</div>;
  }

  return (
    <div>
      <h1>Thank you for your purchase!</h1>
      <p>Your payment was successful.</p>
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
