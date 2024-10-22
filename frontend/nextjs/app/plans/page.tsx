'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/config/firebase/AuthContext';
import { Check, ChevronRight, CreditCard } from 'lucide-react';
import { createCheckoutSession, getUserSubscription, Subscription } from '@/actions/apiActions';

function CheckoutButton({ priceId }: { priceId: string }) {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const sessionId = await createCheckoutSession(token, priceId);
      window.location.href = `https://checkout.stripe.com/pay/${sessionId}`;
    } catch (error) {
      console.error('Checkout error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handleCheckout}
      disabled={isLoading} 
      className="mt-8 w-full py-3 px-4 rounded-lg text-white font-semibold bg-blue-500 hover:bg-blue-600 transition-colors"
    >
      {isLoading ? 'Processing...' : 'Choose Plan'}
    </button>
  );
}

function PlanCard({ title, price, features, isPopular, priceId }: { 
  title: string; 
  price: string; 
  features: string[]; 
  isPopular?: boolean; 
  priceId: string 
}) {
  return (
    <motion.div
      className={`bg-white rounded-2xl shadow-xl overflow-hidden ${isPopular ? 'border-2 border-blue-500' : ''}`}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="p-8">
        <h3 className="text-2xl font-bold mb-2">{title}</h3>
        <p className="text-4xl font-bold mb-6">{price}</p>
        <ul className="space-y-3 mb-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center">
              <Check className="text-green-500 mr-2" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <CheckoutButton priceId={priceId} />
      </div>
    </motion.div>
  );
}

export default function PlansPage() {
  const { user } = useAuth();
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    async function fetchSubscription() {
      if (user) {
        try {
          const token = await user.getIdToken();
          const subscription = await getUserSubscription(token);
          setCurrentSubscription(subscription);
        } catch (error) {
          console.error('Error fetching subscription:', error);
        }
      }
    }
    fetchSubscription();
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 text-gray-900 py-20">
      <motion.div 
        className="container mx-auto px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-5xl font-bold mb-4 text-center">Choose Your Plan</h1>
        <p className="text-xl text-gray-600 text-center mb-12">Select the perfect plan for your research needs</p>
        
        {currentSubscription && (
          <div className="mb-8 p-4 bg-blue-100 rounded-lg text-center">
            <p className="text-lg">You currently have an active {currentSubscription.plan} subscription.</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <PlanCard 
            title="Per Report" 
            price="$1/report" 
            features={[
              "5 Detailed Reports using GPT-4",
              "10 Summary Reports",
              "Save Reports to Account",
              "24/7 Support"
            ]}
            priceId="prod_R0bEOf1dWZCjyY"
          />
          <PlanCard 
            title="Subscription" 
            price="$20/month" 
            features={[
              "30 Detailed Reports using GPT-4",
              "Latest AI Models Access",
              "Unlimited Summary Reports",
              "Save Reports to Account",
              "Priority Support"
            ]}
            isPopular
            priceId="prod_Qvu89XrhkHjzZU"
          />
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-gray-600 flex items-center justify-center">
            <CreditCard className="mr-2" /> Secure payment powered by Stripe
          </p>
        </div>
      </motion.div>
    </div>
  );
}
