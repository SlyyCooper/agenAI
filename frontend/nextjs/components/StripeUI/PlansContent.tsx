'use client';

import { useState, useEffect } from 'react';
import { 
  createCheckoutSession, 
  getProducts, 
  getSubscriptionStatus 
} from '@/api/stripeAPI';
import { getAccessStatus } from '@/api/userprofileAPI';

import {
  Product,
  ProductsResponse,
  SubscriptionStatusResponse,
  AccessStatus 
} from '@/types/interfaces/api.types';

import { useAuth } from '@/config/firebase/AuthContext';

interface LoadingState {
  page: boolean;
  purchase: boolean;
}

// Add validation function
const validateProductsResponse = (data: unknown): data is ProductsResponse => {
  return data !== null && 
         typeof data === 'object' && 
         'subscription' in data && 
         'one_time' in data;
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
  const { user } = useAuth();
  const [loading, setLoading] = useState<LoadingState>({ page: true, purchase: false });
  const [error, setError] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionStatusResponse | null>(null);
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null);
  const [products, setProducts] = useState<ProductsResponse | null>(null);

  useEffect(() => {
    const initializePage = async () => {
      if (!user) return;
      setLoading(prev => ({ ...prev, page: true }));
      setError(null);
      
      try {
        const [productsData, subscriptionStatus, access] = await Promise.all([
          getProducts(),
          getSubscriptionStatus(),
          getAccessStatus()
        ]);
        
        setProducts(productsData);
        setCurrentSubscription(subscriptionStatus);
        setAccessStatus(access);
      } catch (err) {
        console.error('Error initializing page:', err);
        setError(getErrorMessage(err));
      } finally {
        setLoading(prev => ({ ...prev, page: false }));
      }
    };

    initializePage();
  }, [user]);

  const handlePurchase = async (priceId: string, mode: 'subscription' | 'payment') => {
    setLoading(prev => ({ ...prev, purchase: true }));
    setError(null);
    
    try {
      await createCheckoutSession(priceId, mode);
    } catch (err) {
      console.error('Purchase error:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(prev => ({ ...prev, purchase: false }));
    }
  };

  const renderPlanButton = (plan: Product, mode: 'subscription' | 'payment') => {
    const isSubscription = mode === 'subscription';
    const isDisabled = loading.purchase || 
      (isSubscription ? currentSubscription?.subscription_status === 'active' : 
       accessStatus?.access_type === 'one_time');

    const buttonText = loading.purchase ? 'Processing...' : 
      isSubscription ? 
        (currentSubscription?.subscription_status === 'active' ? 'Current Plan' : 'Start Subscription') :
        (accessStatus?.access_type === 'one_time' ? 'Already Purchased' : 'Buy Now');

    const buttonClass = `mt-8 block w-full py-3 px-6 border border-transparent rounded-md text-white font-medium text-center
      ${loading.purchase ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}
      ${isDisabled ? 'bg-gray-400 cursor-not-allowed' : isSubscription ? 'bg-blue-600' : 'bg-green-600'}`;

    return (
      <button
        onClick={() => handlePurchase(plan.price_id, mode)}
        disabled={isDisabled}
        className={buttonClass}
      >
        {buttonText}
      </button>
    );
  };

  if (loading.page || !products) {
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
            Choose Your Plan
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

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {/* Subscription Plan */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-8">
              <h2 className="text-2xl font-bold text-gray-900">
                {products.subscription.name}
              </h2>
              <p className="mt-4 text-gray-500">Perfect for continuous research needs</p>
              <p className="mt-8">
                <span className="text-4xl font-extrabold text-gray-900">
                  ${products.subscription.price}
                </span>
                <span className="text-base font-medium text-gray-500">/month</span>
              </p>
              <ul className="mt-6 space-y-4">
                {products.subscription.features.map((feature, index) => (
                  <li key={`${feature}-${index}`} className="flex">
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
              {renderPlanButton(products.subscription, 'subscription')}
            </div>
          </div>

          {/* One-Time Purchase Plan */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-8">
              <h2 className="text-2xl font-bold text-gray-900">
                {products.one_time.name}
              </h2>
              <p className="mt-4 text-gray-500">Perfect for short-term projects</p>
              <p className="mt-8">
                <span className="text-4xl font-extrabold text-gray-900">
                  ${products.one_time.price}
                </span>
                <span className="text-base font-medium text-gray-500">/one-time</span>
              </p>
              <ul className="mt-6 space-y-4">
                {products.one_time.features.map((feature, index) => (
                  <li key={`${feature}-${index}`} className="flex">
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
              {renderPlanButton(products.one_time, 'payment')}
            </div>
          </div>
        </div>

        <div className="mt-12 text-center text-gray-500">
          <p>All plans include:</p>
          <ul className="mt-4">
            <li>30-day money-back guarantee</li>
            <li>24/7 customer support</li>
            <li>Secure payment processing</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
