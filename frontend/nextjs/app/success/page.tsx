'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { getCheckoutSession } from '@/config/firebase/backendService';
import { useAuth } from '@/config/firebase/AuthContext';

function SuccessContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const searchParams = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId && user) {
      getCheckoutSession(sessionId)
        .then((res) => {
          if (res.data.status === 'complete') {
            setStatus('success');
            // Here you might want to update the user's local state or trigger a refresh of their subscription status
          } else {
            setStatus('error');
          }
        })
        .catch(() => setStatus('error'));
    }
  }, [searchParams, user]);

  if (status === 'loading') {
    return <div className="text-center py-10">Verifying your payment...</div>;
  }

  if (status === 'error') {
    return <div className="text-center py-10 text-red-500">An error occurred. Please contact support.</div>;
  }

  return (
    <div className="text-center py-10">
      <h1 className="text-3xl font-bold mb-4">Thank you for your purchase!</h1>
      <p className="mb-4">Your payment was successful and your account has been updated.</p>
      <p>You can now start using your new features.</p>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
