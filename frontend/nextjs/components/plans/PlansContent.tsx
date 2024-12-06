'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/config/firebase/AuthContext';

const PlansContent: React.FC = () => {
    const router = useRouter();
    const { user } = useAuth();

    const plans = [
        {
            name: 'Basic',
            price: '$9.99/month',
            features: [
                '10 Research Reports',
                'Basic Analysis',
                'Email Support'
            ]
        },
        {
            name: 'Pro',
            price: '$29.99/month',
            features: [
                'Unlimited Research Reports',
                'Advanced Analysis',
                'Priority Support',
                'Custom Export Formats'
            ]
        }
    ];

    const handleSelectPlan = async (planName: string) => {
        if (!user) {
            router.push('/login');
            return;
        }
        
        // Handle plan selection logic
        try {
            const response = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    planName,
                    userId: user.uid
                }),
            });
            
            const { sessionId } = await response.json();
            
            // Redirect to checkout
            router.push(`/checkout?session_id=${sessionId}`);
        } catch (error) {
            console.error('Error selecting plan:', error);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
                <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                    Choose Your Plan
                </h2>
                <p className="mt-4 text-lg text-gray-600">
                    Select the plan that best fits your research needs
                </p>
            </div>

            <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-2">
                {plans.map((plan) => (
                    <div
                        key={plan.name}
                        className="border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200"
                    >
                        <div className="p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                {plan.name}
                            </h3>
                            <p className="mt-4 text-3xl font-extrabold text-gray-900">
                                {plan.price}
                            </p>
                            <ul className="mt-6 space-y-4">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex">
                                        <svg
                                            className="flex-shrink-0 h-6 w-6 text-green-500"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            aria-hidden="true"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                        <span className="ml-3 text-gray-500">
                                            {feature}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => handleSelectPlan(plan.name)}
                                className="mt-8 block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-md text-center"
                            >
                                Select {plan.name}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PlansContent;
