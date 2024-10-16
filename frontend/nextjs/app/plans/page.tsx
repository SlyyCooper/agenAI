'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import getStripe from '@/config/stripe/get-stripejs';
import { useAuth } from '@/config/firebase/AuthContext';
import { createCheckoutSession } from '@/config/firebase/backendService';

export default function PlansPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const handleCheckout = async (plan: string) => {
    setIsLoading(true);

    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await createCheckoutSession(plan, plan === 'per-report' ? 100 : 2000);
      const { sessionId } = response.data;
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
          <div className="bg-white p-8 rounded-xl shadow-lg flex flex-col">
            <div>
              <h3 className="text-2xl font-bold mb-4">Per Report</h3>
              <p className="text-gray-600 mb-4">Perfect for one-time insights or occasional use.</p>
              <div className="flex items-start mb-6">
                <p className="text-4xl font-bold">$1<span className="text-xl text-gray-600 font-normal">/report</span></p>
                <p className="text-xs text-gray-500 ml-2 mt-1 italic">*Minimum of 5 reports</p>
              </div>
              <ul className="mb-8 space-y-2">
                <li className="flex items-center"><ArrowRight className="mr-2 h-5 w-5 text-green-500" /> 5 Detailed Reports using gpt-4o</li>
                <li className="flex items-center"><ArrowRight className="mr-2 h-5 w-5 text-green-500" /> 10 Summary Reports</li>
                <li className="flex items-center"><ArrowRight className="mr-2 h-5 w-5 text-green-500" /> Ability to Save Reports to Account</li>
                <li className="invisible flex items-center"><ArrowRight className="mr-2 h-5 w-5" /> &nbsp;</li>
                <li className="invisible flex items-center"><ArrowRight className="mr-2 h-5 w-5" /> &nbsp;</li>
              </ul>
            </div>
            <div className="mt-auto">
              <button 
                onClick={() => handleCheckout('per-report')}
                disabled={isLoading}
                className="w-full bg-black text-white px-4 py-2 rounded-full font-semibold hover:bg-gray-800 transition-colors inline-block text-center disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Get Started'}
              </button>
            </div>
          </div>
          <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-blue-500 flex flex-col">
            <h3 className="text-2xl font-bold mb-4">Subscription</h3>
            <p className="text-gray-600 mb-4">For ongoing insights and continuous support.</p>
            <p className="text-4xl font-bold mb-6">$20<span className="text-xl text-gray-600 font-normal">/month</span></p>
            <ul className="mb-8 space-y-2">
              <li className="flex items-center"><ArrowRight className="mr-2 h-5 w-5 text-green-500" /> 30 Detailed Reports using gpt-4o</li>
              <li className="flex items-center"><ArrowRight className="mr-2 h-5 w-5 text-green-500" /> Access to the latest AI models</li>
              <li className="flex items-center"><ArrowRight className="mr-2 h-5 w-5 text-green-500" /> Unlimited Summary Reports</li>
              <li className="flex items-center"><ArrowRight className="mr-2 h-5 w-5 text-green-500" /> Ability to Save Reports to Account</li>
              <li className="flex items-center"><ArrowRight className="mr-2 h-5 w-5 text-green-500" /> Priority support</li>
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
