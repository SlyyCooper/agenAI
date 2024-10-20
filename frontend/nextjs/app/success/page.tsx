'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useAuth } from '@/config/firebase/AuthContext';
import { verifyPayment } from '@/actions/apiActions';

function SuccessContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const searchParams = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    const checkPayment = async () => {
      const sessionId = searchParams.get('session_id');
      if (sessionId && user) {
        try {
          const token = await user.getIdToken();
          const result = await verifyPayment(token, sessionId);
          if (result.status === 'paid') {
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

    checkPayment();
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
