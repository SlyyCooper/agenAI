'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/config/firebase/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Check, ChevronRight, CreditCard } from 'lucide-react';
import { createPaymentIntent, createSubscription, getUserSubscription, Subscription } from '@/actions/apiActions';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutForm({ amount, isSubscription, priceId }: { amount: number; isSubscription: boolean; priceId?: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      let clientSecret;

      if (isSubscription && priceId) {
        const response = await createSubscription(token, priceId);
        clientSecret = response.clientSecret;
      } else {
        const response = await createPaymentIntent(token, amount, 'usd');
        clientSecret = response.clientSecret;
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card Element not found');
      }

      // Create a PaymentMethod and attach it to the PaymentIntent
      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: user.displayName || undefined,
        },
      });

      if (paymentMethodError) {
        setError(paymentMethodError.message || 'An error occurred while creating the payment method');
        return;
      }

      // Confirm the PaymentIntent with the created PaymentMethod
      const { error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethod.id,
      });

      if (confirmError) {
        setError(confirmError.message || 'An error occurred while confirming the payment');
      } else {
        window.location.href = '/success';
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 max-w-md mx-auto">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Enter your card details</h3>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
        {error && <div className="text-red-500 mt-2 text-sm">{error}</div>}
        <button 
          type="submit"
          disabled={isLoading} 
          className="mt-4 w-full py-3 px-4 rounded-lg text-white font-semibold bg-blue-500 hover:bg-blue-600 transition-colors"
        >
          {isLoading ? 'Processing...' : 'Pay Now'}
        </button>
      </div>
    </form>
  );
}

function PlanCard({ title, price, features, amount, isPopular, priceId }: { title: string; price: string; features: string[]; amount: number; isPopular?: boolean; priceId: string }) {
  const [showCheckout, setShowCheckout] = useState(false);

  return (
    <motion.div
      className={`bg-white rounded-2xl shadow-xl overflow-hidden ${isPopular ? 'border-2 border-blue-500' : ''}`}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {isPopular && (
        <div className="bg-blue-500 text-white text-center py-2 font-semibold">
          Most Popular
        </div>
      )}
      <div className="p-8">
        <h3 className="text-2xl font-bold mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">Perfect for your research needs</p>
        <p className="text-4xl font-bold mb-6">{price}</p>
        <ul className="mb-8 space-y-4">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center">
              <Check className="mr-2 h-5 w-5 text-green-500" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <button 
          onClick={() => setShowCheckout(true)} 
          className={`w-full py-3 px-4 rounded-lg text-white font-semibold flex items-center justify-center transition-colors ${
            isPopular ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-800 hover:bg-gray-900'
          }`}
        >
          Select Plan <ChevronRight className="ml-2 h-5 w-5" />
        </button>
      </div>
      {showCheckout && (
        <Elements stripe={stripePromise}>
          <CheckoutForm amount={amount} isSubscription={title === "Subscription"} priceId={priceId} />
        </Elements>
      )}
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
            amount={100}
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
            amount={2000}
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
