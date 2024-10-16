'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CancelPage() {
  const router = useRouter();

  useEffect(() => {
    // Optionally, you can add some analytics here to track cancelled checkouts
    // For example: trackCancelledCheckout();
  }, []);

  const handleReturnToPlans = () => {
    router.push('/plans');
  };

  return (
    <div className="text-center py-10">
      <h1 className="text-3xl font-bold mb-4">Payment Cancelled</h1>
      <p className="mb-4">Your payment was cancelled and you have not been charged.</p>
      <p className="mb-6">If you have any questions, please contact our support team.</p>
      <button
        onClick={handleReturnToPlans}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Return to Plans
      </button>
    </div>
  );
}
