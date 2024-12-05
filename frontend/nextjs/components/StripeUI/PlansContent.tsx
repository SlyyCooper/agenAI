'use client';

import { useState, useEffect } from 'react';
import { 
  createCheckoutSession, 
  getProducts, 
  getSubscriptionStatus 
} from '@/api/stripeAPI';
import { getAccessStatus } from '@/api/userprofileAPI';
import { useRouter } from 'next/navigation';
import {
  Product,
  ProductsResponse,
  SubscriptionStatusResponse,
  AccessStatus 
} from '@/types/interfaces/api.types';
import { useAuth } from '@/config/firebase/AuthContext';

// Enhanced loading state
interface LoadingState {
  page: boolean;
  purchase: boolean;
  features: boolean;
}

// Pricing tiers with features
const PRICING_TIERS = {
  FREE: {
    name: 'Free',
    price: 0,
    features: [
      '5 research reports/month',
      'Basic AI models',
      'Community support',
      'Standard response time'
    ],
    limits: {
      reportsPerMonth: 5,
      tokensPerReport: 1000,
      modelAccess: ['gpt-3.5-turbo']
    }
  },
  PRO: {
    name: 'Pro',
    price: 29,
    features: [
      'Unlimited research reports',
      'Advanced AI models',
      'Priority support',
      'Faster response time',
      'Custom report formats',
      'API access'
    ],
    limits: {
      reportsPerMonth: -1, // unlimited
      tokensPerReport: 4000,
      modelAccess: ['gpt-4', 'gpt-3.5-turbo']
    }
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 99,
    features: [
      'Everything in Pro',
      'Team collaboration',
      'Custom AI models',
      '24/7 dedicated support',
      'SLA guarantees',
      'Custom integrations',
      'Training sessions'
    ],
    limits: {
      reportsPerMonth: -1,
      tokensPerReport: 8000,
      modelAccess: ['gpt-4', 'gpt-3.5-turbo', 'claude-3']
    }
  }
};

// Add more specific error messages
const getErrorMessage = (err: unknown) => {
  if (err instanceof Error) {
    if (err.message.includes('checkout')) return 'Unable to start checkout process';
    if (err.message.includes('subscription')) return 'Unable to verify subscription status';
    return err.message;
  }
  return 'An unexpected error occurred';
};

export default function PlansContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState<LoadingState>({ 
    page: true, 
    purchase: false,
    features: false 
  });
  const [error, setError] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionStatusResponse | null>(null);
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null);
  const [selectedTier, setSelectedTier] = useState<keyof typeof PRICING_TIERS | null>(null);

  useEffect(() => {
    const initializePage = async () => {
      if (!user) {
        router.push('/login?redirect=plans');
        return;
      }
      
      setLoading(prev => ({ ...prev, page: true }));
      setError(null);
      
      try {
        const [subscriptionStatus, access] = await Promise.all([
          getSubscriptionStatus(),
          getAccessStatus()
        ]);
        
        setCurrentSubscription(subscriptionStatus);
        setAccessStatus(access);
        
        // Set initial selected tier based on current subscription
        if (subscriptionStatus?.subscription_status === 'active' && subscriptionStatus?.subscription_id) {
          setSelectedTier(subscriptionStatus.subscription_id.includes('enterprise') ? 'ENTERPRISE' : 'PRO');
        } else {
          setSelectedTier('FREE');
        }
      } catch (err) {
        console.error('Error initializing page:', err);
        setError(getErrorMessage(err));
      } finally {
        setLoading(prev => ({ ...prev, page: false }));
      }
    };

    initializePage();
  }, [user, router]);

  const handlePurchase = async (tier: keyof typeof PRICING_TIERS) => {
    if (!user) {
      router.push('/login?redirect=plans');
      return;
    }

    setLoading(prev => ({ ...prev, purchase: true }));
    setError(null);
    
    try {
      const priceId = tier === 'ENTERPRISE' 
        ? process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID 
        : process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;
        
      if (!priceId) throw new Error('Invalid price configuration');
      
      await createCheckoutSession(priceId, 'subscription');
    } catch (err) {
      console.error('Purchase error:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(prev => ({ ...prev, purchase: false }));
    }
  };

  const renderTierCard = (tierKey: keyof typeof PRICING_TIERS) => {
    const tier = PRICING_TIERS[tierKey];
    const isCurrentTier = selectedTier === tierKey;
    const isDisabled = loading.purchase || (currentSubscription?.subscription_status === 'active' && isCurrentTier);

    return (
      <div className={`
        bg-white rounded-lg shadow-lg overflow-hidden transform transition-all duration-300
        ${isCurrentTier ? 'ring-2 ring-blue-500 scale-105' : 'hover:scale-102'}
      `}>
        <div className="px-6 py-8">
          {isCurrentTier && (
            <div className="absolute top-0 right-0 mt-4 mr-4">
              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
                Current Plan
              </span>
            </div>
          )}
          
          <h2 className="text-2xl font-bold text-gray-900">
            {tier.name}
          </h2>
          
          <p className="mt-4 text-gray-500">
            {tierKey === 'FREE' ? 'Start your research journey' :
             tierKey === 'PRO' ? 'Perfect for serious researchers' :
             'Built for teams and organizations'}
          </p>
          
          <p className="mt-8">
            <span className="text-4xl font-extrabold text-gray-900">
              ${tier.price}
            </span>
            <span className="text-base font-medium text-gray-500">
              {tierKey === 'FREE' ? '' : '/month'}
            </span>
          </p>
          
          <ul className="mt-6 space-y-4">
            {tier.features.map((feature, index) => (
              <li key={`${tierKey}-${index}`} className="flex">
                <svg
                  className="flex-shrink-0 h-6 w-6 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="ml-3 text-base text-gray-500">{feature}</span>
              </li>
            ))}
          </ul>
          
          <button
            onClick={() => handlePurchase(tierKey)}
            disabled={isDisabled}
            className={`
              mt-8 block w-full py-3 px-6 border border-transparent rounded-md
              text-white font-medium text-center transition-all duration-300
              ${isDisabled 
                ? 'bg-gray-400 cursor-not-allowed' 
                : tierKey === 'ENTERPRISE'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : tierKey === 'PRO'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-green-600 hover:bg-green-700'
              }
            `}
          >
            {loading.purchase ? 'Processing...' :
             isCurrentTier ? 'Current Plan' :
             tierKey === 'FREE' ? 'Get Started' :
             tierKey === 'ENTERPRISE' ? 'Contact Sales' :
             'Upgrade Now'}
          </button>
        </div>
      </div>
    );
  };

  if (loading.page) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Choose Your Research Plan
          </h1>
          <p className="mt-4 text-xl text-gray-500">
            Select the plan that best fits your research needs
          </p>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {Object.keys(PRICING_TIERS).map((tier) => 
            renderTierCard(tier as keyof typeof PRICING_TIERS)
          )}
        </div>

        <div className="mt-16 border-t border-gray-200 pt-16">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">
            Frequently Asked Questions
          </h2>
          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                What happens when I upgrade?
              </h3>
              <p className="mt-2 text-gray-500">
                Your new plan benefits take effect immediately. We'll prorate any existing subscription time.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Can I cancel anytime?
              </h3>
              <p className="mt-2 text-gray-500">
                Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                What payment methods do you accept?
              </h3>
              <p className="mt-2 text-gray-500">
                We accept all major credit cards and process payments securely through Stripe.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Do you offer refunds?
              </h3>
              <p className="mt-2 text-gray-500">
                Yes, we offer a 30-day money-back guarantee for all paid plans.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
