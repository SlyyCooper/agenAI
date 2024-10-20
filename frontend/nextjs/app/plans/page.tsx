'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/config/firebase/AuthContext';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent, amount: number) => {
    event.preventDefault();
    if (!stripe || !elements || !user) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('https://dolphin-app-49eto.ondigitalocean.app/backend/create-payment-intent', {
        amount,
        currency: 'usd',
      }, {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` }
      });

      const { client_secret } = response.data;

      const result = await stripe.confirmCardPayment(client_secret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
          billing_details: {
            name: user.displayName || undefined,
          },
        }
      });

      if (result.error) {
        setError(result.error.message || 'An error occurred');
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
    <div>
      <CardElement />
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </div>
  );
}

function PlanCard({ title, price, features, amount }: { title: string; price: string; features: string[]; amount: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    if (!stripe || !elements || !user) return;

    setIsLoading(true);

    try {
      const response = await axios.post('https://dolphin-app-49eto.ondigitalocean.app/backend/create-payment-intent', {
        amount,
        currency: 'usd',
      }, {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` }
      });

      const { client_secret } = response.data;

      const result = await stripe.confirmCardPayment(client_secret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
          billing_details: {
            name: user.displayName || undefined,
          },
        }
      });

      if (result.error) {
        throw new Error(result.error.message);
      } else {
        window.location.href = '/success';
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg flex flex-col">
      <h3 className="text-2xl font-bold mb-4">{title}</h3>
      <p className="text-gray-600 mb-4">Perfect for one-time insights or occasional use.</p>
      <p className="text-4xl font-bold mb-6">{price}</p>
      <ul className="mb-8 space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center">
            <ArrowRight className="mr-2 h-5 w-5 text-green-500" /> {feature}
          </li>
        ))}
      </ul>
      <button 
        onClick={handlePayment} 
        disabled={isLoading} 
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
      >
        {isLoading ? 'Processing...' : 'Select Plan'}
      </button>
    </div>
  );
}

export default function PlansPage() {
  return (
    <Elements stripe={stripePromise}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900 py-20">
        <div className="container mx-auto px-6">
          <h1 className="text-4xl font-bold mb-12 text-center">Choose Your Plan</h1>
          <div className="mb-8">
            <CheckoutForm />
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <PlanCard 
              title="Per Report" 
              price="$1/report" 
              features={[
                "5 Detailed Reports using gpt-4o",
                "10 Summary Reports",
                "Ability to Save Reports to Account"
              ]}
              amount={100}
            />
            <PlanCard 
              title="Subscription" 
              price="$20/month" 
              features={[
                "30 Detailed Reports using gpt-4o",
                "Access to the latest AI models",
                "Unlimited Summary Reports",
                "Ability to Save Reports to Account",
                "Priority support"
              ]}
              amount={2000}
            />
          </div>
        </div>
      </div>
    </Elements>
  );
}
