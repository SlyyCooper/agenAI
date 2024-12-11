'use client';

import React, { useState } from 'react';
import { useAuth } from '@/config/firebase/AuthContext';
import { useFirebase } from '@/hooks/useFirebase';
import { toast } from 'react-hot-toast';
import { UserProfileData } from '@/types/interfaces/api.types';

export default function BillingSection() {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      // Redirect to Stripe checkout
      window.location.href = `/api/create-checkout-session?userId=${user?.uid}`;
    } catch (error) {
      console.error('Error initiating subscription:', error);
      toast.error('Failed to initiate subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyTokens = async () => {
    try {
      setLoading(true);
      // Redirect to Stripe checkout for token purchase
      window.location.href = `/api/create-token-checkout?userId=${user?.uid}`;
    } catch (error) {
      console.error('Error initiating token purchase:', error);
      toast.error('Failed to initiate token purchase');
    } finally {
      setLoading(false);
    }
  };

  if (!user || !userProfile) return null;

  const profile = userProfile as UserProfileData;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-4">Billing Information</h3>
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-600">Current Plan</p>
              <p className="font-medium">
                {profile.has_access ? 'Premium' : 'Free'}
              </p>
            </div>
            <button
              onClick={handleSubscribe}
              disabled={loading || profile.has_access}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {profile.has_access ? 'Subscribed' : 'Subscribe'}
            </button>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-600">Tokens</p>
              <p className="font-medium">{profile.tokens}</p>
            </div>
            <button
              onClick={handleBuyTokens}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Buy Tokens
            </button>
          </div>
        </div>
      </div>

      {profile.payment_history && profile.payment_history.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold mb-3">Payment History</h4>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {profile.payment_history.map((payment, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${payment.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}