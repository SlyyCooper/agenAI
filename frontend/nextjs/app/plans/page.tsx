'use client';

import { useState, useEffect } from 'react';
import { createCheckoutSession, getProducts, getSubscriptionStatus } from '@/actions/stripeAPI';
import type { SubscriptionStatusResponse } from '@/actions/stripeAPI';
import { useAuth } from '@/config/firebase/AuthContext';
import { useRouter } from 'next/router';

interface ProductInfo {
  product_id: string;
  price_id: string;
  name: string;
  price: number;
  features: string[];
}

interface Products {
  subscription: ProductInfo;
  one_time: ProductInfo;
}

export default function PlansPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionStatusResponse | null>(null);
  const [products, setProducts] = useState<Products | null>(null);

  // Check auth first
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load data only after auth is confirmed
  useEffect(() => {
    const initializePage = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const [productsData, status] = await Promise.all([
          getProducts(),
          getSubscriptionStatus()
        ]);
        setProducts(productsData);
        setCurrentSubscription(status);
      } catch (err) {
        console.error('Error initializing page:', err);
        setError('Failed to load product information');
      } finally {
        setLoading(false);
      }
    };

    if (user && !authLoading) {
      initializePage();
    }
  }, [user, authLoading]);

  // Show auth loading state
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>;
  }

  // Prevent flash of content
  if (!user) {
    return null;
  }

  const handlePurchase = async (priceId: string, mode: 'subscription' | 'payment') => {
    setPurchaseLoading(true);
    setError(null);
    try {
      await createCheckoutSession(priceId, mode);
      // Don't reset loading state here since we're redirecting
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process payment');
      setPurchaseLoading(false);
    }
  };

  if (loading || !products) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>;
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
                {products.subscription.features.map((feature) => (
                  <li key={feature} className="flex">
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
                onClick={() => handlePurchase(products.subscription.price_id, 'subscription')}
                disabled={purchaseLoading || currentSubscription?.subscription_status === 'active'}
                className={`mt-8 block w-full bg-blue-600 py-3 px-6 border border-transparent rounded-md text-white font-medium text-center
                  ${purchaseLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}
                  ${currentSubscription?.subscription_status === 'active' ? 'bg-gray-400 cursor-not-allowed' : ''}
                `}
              >
                {purchaseLoading ? 'Processing...' : 
                 currentSubscription?.subscription_status === 'active' ? 'Current Plan' : 
                 'Start Subscription'}
              </button>
            </div>
          </div>

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
                {products.one_time.features.map((feature) => (
                  <li key={feature} className="flex">
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
                onClick={() => handlePurchase(products.one_time.price_id, 'payment')}
                disabled={purchaseLoading || currentSubscription?.one_time_purchase}
                className={`mt-8 block w-full bg-green-600 py-3 px-6 border border-transparent rounded-md text-white font-medium text-center
                  ${purchaseLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}
                  ${currentSubscription?.one_time_purchase ? 'bg-gray-400 cursor-not-allowed' : ''}
                `}
              >
                {purchaseLoading ? 'Processing...' : 
                 currentSubscription?.one_time_purchase ? 'Already Purchased' : 
                 'Buy Now'}
              </button>
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
