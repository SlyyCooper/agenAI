'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/config/firebase/AuthContext';
import {
  getUserProfile,
  getUserSubscription,
  getPaymentHistory,
  getAccessStatus
} from '@/actions/userprofileAPI';
import {
  getSubscriptionStatus,
  createPortalSession,
  cancelSubscription
} from '@/actions/stripeAPI';

import type { UserProfile } from '@/actions/userprofileAPI';
import type { SubscriptionStatusResponse } from '@/actions/stripeAPI';

interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  status: string;
  type: 'subscription' | 'one-time';
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for different data types
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatusResponse | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [accessStatus, setAccessStatus] = useState<{ has_access: boolean }>({ has_access: false });

  // Check authentication first
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login'); // Redirect to login if not authenticated
    }
  }, [user, authLoading, router]);

  // Load dashboard data only when authenticated
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return; // Don't load data if not authenticated
      
      try {
        setLoading(true);
        const [subscriptionData, paymentData, accessData] = await Promise.all([
          getSubscriptionStatus(),
          getPaymentHistory(),
          getAccessStatus()
        ]);

        // Use userProfile from AuthContext instead of separate API call
        setProfile(userProfile);
        setSubscription(subscriptionData);
        setPaymentHistory(paymentData);
        setAccessStatus(accessData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    if (user && userProfile) {
      loadDashboardData();
    }
  }, [user, userProfile]); // Add dependencies

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Prevent flash of content while redirecting
  if (!user) {
    return null;
  }

  // Handle subscription management
  const handleManageSubscription = async () => {
    try {
      await createPortalSession();
      // Redirect is handled by the API function
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open subscription portal');
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await cancelSubscription();
      // Refresh subscription status
      const newStatus = await getSubscriptionStatus();
      setSubscription(newStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Profile Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Profile Information</h2>
          {profile && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Email</p>
                <p className="font-medium">{profile.email}</p>
              </div>
              <div>
                <p className="text-gray-600">Name</p>
                <p className="font-medium">{profile.name || 'Not set'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Subscription Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Subscription Status</h2>
          {subscription && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600">Status</p>
                  <p className="font-medium capitalize">
                    {subscription.subscription_status || 'No active subscription'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Access</p>
                  <p className={`font-medium ${accessStatus.has_access ? 'text-green-600' : 'text-red-600'}`}>
                    {accessStatus.has_access ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
              
              {subscription.subscription_end_date && (
                <div>
                  <p className="text-gray-600">Expires</p>
                  <p className="font-medium">
                    {new Date(subscription.subscription_end_date).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={handleManageSubscription}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Manage Subscription
                </button>
                {subscription.subscription_status === 'active' && (
                  <button
                    onClick={handleCancelSubscription}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Cancel Subscription
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Payment History */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Payment History</h2>
          {paymentHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paymentHistory.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(payment.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        ${payment.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap capitalize">
                        {payment.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${payment.status === 'succeeded' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No payment history available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
