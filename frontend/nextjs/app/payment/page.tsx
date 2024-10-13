'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import getStripe from '@/config/stripe/get-stripejs';
import { Suspense } from 'react';

function PaymentContent() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plan, setPlan] = useState('');
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    const planFromUrl = searchParams.get('plan');
    if (planFromUrl === 'per-report') {
      setPlan('Per Report');
      setAmount(100); // $1 in cents
    } else if (planFromUrl === 'subscription') {
      setPlan('Subscription');
      setAmount(2000); // $20 in cents
    } else {
      // Handle invalid plan
      router.push('/plans');
    }
  }, [searchParams, router]);

  const handleCheckout = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/checkout_sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, plan }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const { sessionId } = await response.json();
      const stripe = await getStripe();
      const { error } = await stripe!.redirectToCheckout({ sessionId });

      if (error) {
        console.error('Stripe checkout error:', error);
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <h1 className="text-3xl font-bold mb-6 text-center">Complete Your Payment</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-lg font-medium text-gray-700 mb-4">
          Plan: {plan}
        </p>
        <p className="text-lg font-medium text-gray-700 mb-6">
          Amount: ${amount / 100}.00
        </p>
        <button
          onClick={handleCheckout}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : 'Proceed to Checkout'}
        </button>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentContent />
    </Suspense>
  );
}
