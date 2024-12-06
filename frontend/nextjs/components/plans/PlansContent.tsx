'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/config/firebase/AuthContext';
import { createCheckoutSession, getSubscriptionStatus } from '@/api/stripeAPI';
import type { SubscriptionStatusResponse } from '@/types/interfaces/api.types';

interface LoadingState {
    page: boolean;
    purchase: boolean;
}

const PlansContent = () => {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState<LoadingState>({ page: true, purchase: false });
    const [error, setError] = useState<string | null>(null);
    const [currentSubscription, setCurrentSubscription] = useState<SubscriptionStatusResponse | null>(null);

    useEffect(() => {
        const initializePage = async () => {
            if (!user) return;
            
            try {
                const subscriptionStatus = await getSubscriptionStatus();
                setCurrentSubscription(subscriptionStatus);
            } catch (err) {
                console.error('Error fetching subscription status:', err);
                setError('Unable to verify subscription status');
            } finally {
                setLoading(prev => ({ ...prev, page: false }));
            }
        };

        initializePage();
    }, [user]);

    const handleSubscribe = async (priceId: string, mode: 'subscription' | 'payment') => {
        if (!user) {
            router.push('/login');
            return;
        }
        setLoading(prev => ({ ...prev, purchase: true }));
        setError(null);
        try {
            await createCheckoutSession(priceId, mode);
        } catch (error) {
            console.error('Error creating checkout session:', error);
            setError('Unable to start checkout process');
        } finally {
            setLoading(prev => ({ ...prev, purchase: false }));
        }
    };

    const isCurrentPlan = (plan: { priceId: string, mode: 'subscription' | 'payment' }) => {
        if (!currentSubscription) return false;
        if (plan.mode === 'subscription') {
            return currentSubscription.subscription_status === 'active' && 
                   currentSubscription.subscription_id === plan.priceId;
        }
        return false;
    };

    const plans = [
        {
            name: 'Premium Research Plan',
            price: '$20',
            interval: '/month',
            features: [
                '20 Research Queries per Month',
                'Professional Research Capabilities',
                'Advanced AI Analysis',
                'Priority Support',
                'Custom Export Formats',
                'Advanced Analytics Dashboard'
            ],
            priceId: 'price_1QRFWj060pc64aKulUjwYgLq',
            mode: 'subscription' as const,
            popular: true
        },
        {
            name: 'Research Query Bundle',
            price: '$5',
            interval: ' one-time',
            features: [
                '3 Research Queries',
                'Professional Research Capabilities',
                'Basic Support',
                'Standard Export Formats',
                'Access to Core Features'
            ],
            priceId: 'price_1QRFX2060pc64aKurOH4hUvj',
            mode: 'payment' as const,
            popular: false
        }
    ];

    if (loading.page) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-4xl text-center">
                        <h2 className="text-base font-semibold leading-7 text-indigo-600">Pricing</h2>
                        <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                            Choose your research plan
                        </p>
                        <p className="mt-4 text-lg text-gray-600">
                            Select the plan that best fits your research needs
                        </p>
                    </div>

                    {error && (
                        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg mx-auto max-w-2xl">
                            {error}
                        </div>
                    )}

                    <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-y-6 sm:mt-20 lg:max-w-4xl lg:grid-cols-2">
                        {plans.map((plan) => (
                            <div
                                key={plan.name}
                                className={`flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 ring-gray-200 xl:p-10 ${
                                    plan.popular ? 'relative lg:mx-4 transform lg:scale-105' : 'lg:mx-4'
                                } transition-all duration-300 hover:shadow-xl`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 right-8 rounded-full bg-indigo-600 px-4 py-1 text-xs font-semibold text-white">
                                        Most Popular
                                    </div>
                                )}
                                {isCurrentPlan(plan) && (
                                    <div className="absolute -top-3 left-8 rounded-full bg-green-600 px-4 py-1 text-xs font-semibold text-white">
                                        Current Plan
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center justify-between gap-x-4">
                                        <h3 className="text-lg font-semibold leading-8 text-gray-900">
                                            {plan.name}
                                        </h3>
                                    </div>
                                    <p className="mt-6 flex items-baseline gap-x-1">
                                        <span className="text-4xl font-bold tracking-tight text-gray-900">
                                            {plan.price}
                                        </span>
                                        <span className="text-sm font-semibold leading-6 text-gray-600">
                                            {plan.interval}
                                        </span>
                                    </p>
                                    <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                                        {plan.features.map((feature) => (
                                            <li key={feature} className="flex gap-x-3">
                                                <svg
                                                    className="h-6 w-5 flex-none text-indigo-600"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                    aria-hidden="true"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <button
                                    onClick={() => handleSubscribe(plan.priceId, plan.mode)}
                                    disabled={loading.purchase || isCurrentPlan(plan)}
                                    className={`mt-8 block rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 
                                        ${loading.purchase 
                                            ? 'bg-gray-400 cursor-not-allowed' 
                                            : isCurrentPlan(plan)
                                            ? 'bg-green-600 cursor-not-allowed'
                                            : plan.popular
                                                ? 'bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-indigo-600'
                                                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                        }`}
                                >
                                    {loading.purchase 
                                        ? 'Processing...' 
                                        : isCurrentPlan(plan)
                                        ? 'Current Plan'
                                        : 'Get started today'}
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* FAQ Section */}
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
        </div>
    );
};

export default PlansContent;
