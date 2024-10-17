'use client'; // Indicates that this is a client-side component

// Importing necessary hooks and functions
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { getCheckoutSession } from '@/config/firebase/backendService';
import { useAuth } from '@/config/firebase/AuthContext';

// Component to handle the success page content
function SuccessContent() {
  // State to manage the payment status
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  // Hook to access URL search parameters
  const searchParams = useSearchParams();
  // Hook to access the authenticated user
  const { user } = useAuth();

  useEffect(() => {
    // Get the session ID from the URL parameters
    const sessionId = searchParams.get('session_id');
    // If there's a session ID and a user is authenticated
    if (sessionId && user) {
      // Verify the checkout session with the backend
      getCheckoutSession(sessionId)
        .then((res) => {
          if (res.data.status === 'complete') {
            // If the payment is complete, set status to success
            setStatus('success');
            // TODO: Update user's local state or refresh subscription status
          } else {
            // If payment is not complete, set status to error
            setStatus('error');
          }
        })
        .catch(() => setStatus('error')); // Handle any errors
    }
  }, [searchParams, user]); // Re-run effect if searchParams or user changes

  // Render loading message while verifying payment
  if (status === 'loading') {
    return <div className="text-center py-10">Verifying your payment...</div>;
  }

  // Render error message if payment verification failed
  if (status === 'error') {
    return <div className="text-center py-10 text-red-500">An error occurred. Please contact support.</div>;
  }

  // Render success message if payment is verified
  return (
    <div className="text-center py-10">
      <h1 className="text-3xl font-bold mb-4">Thank you for your purchase!</h1>
      <p className="mb-4">Your payment was successful and your account has been updated.</p>
      <p>You can now start using your new features.</p>
    </div>
  );
}

// Main component for the success page
export default function SuccessPage() {
  return (
    // Wrap SuccessContent in Suspense for better loading handling
    <Suspense fallback={<div className="text-center py-10">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
