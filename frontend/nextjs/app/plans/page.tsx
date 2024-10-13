'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import getStripe from '@/config/stripe/get-stripejs';

export default function PlansPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async (plan: string) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/checkout_sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          plan,
          amount: plan === 'per-report' ? 100 : 2000 // $1 or $20 in cents
        }),
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900 py-20">
      <div className="container mx-auto px-6">
        <h1 className="text-4xl font-bold mb-12 text-center">Choose Your Plan</h1>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold mb-4">Per Report</h3>
            <p className="text-gray-600 mb-4">Perfect for one-time insights or occasional use.</p>
            <p className="text-4xl font-bold mb-6">$1<span className="text-xl text-gray-600 font-normal">/report</span></p>
            <ul className="mb-8 space-y-2">
              <li className="flex items-center"><ArrowRight className="mr-2 h-5 w-5 text-green-500" /> Comprehensive AI analysis</li>
              <li className="flex items-center"><ArrowRight className="mr-2 h-5 w-5 text-green-500" /> Customized insights</li>
              <li className="flex items-center"><ArrowRight className="mr-2 h-5 w-5 text-green-500" /> 30-day support</li>
            </ul>
            <button 
              onClick={() => handleCheckout('per-report')}
              disabled={isLoading}
              className="w-full bg-black text-white px-4 py-2 rounded-full font-semibold hover:bg-gray-800 transition-colors inline-block text-center disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Get Started'}
            </button>
          </div>
          <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-blue-500">
            <h3 className="text-2xl font-bold mb-4">Subscription</h3>
            <p className="text-gray-600 mb-4">For ongoing insights and continuous support.</p>
            <p className="text-4xl font-bold mb-6">$20<span className="text-xl text-gray-600 font-normal">/month</span></p>
            <ul className="mb-8 space-y-2">
              <li className="flex items-center"><ArrowRight className="mr-2 h-5 w-5 text-green-500" /> Unlimited AI-powered reports</li>
              <li className="flex items-center"><ArrowRight className="mr-2 h-5 w-5 text-green-500" /> Real-time data updates</li>
              <li className="flex items-center"><ArrowRight className="mr-2 h-5 w-5 text-green-500" /> Priority support</li>
              <li className="flex items-center"><ArrowRight className="mr-2 h-5 w-5 text-green-500" /> Customized AI models</li>
            </ul>
            <button 
              onClick={() => handleCheckout('subscription')}
              disabled={isLoading}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-600 transition-colors inline-block text-center disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Subscribe Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
