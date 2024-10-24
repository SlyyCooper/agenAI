'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/config/firebase/AuthContext';
import {
  getUserProfile,
  getUserSubscription,
  getPaymentHistory,
  getAccessStatus,
  type UserProfile,
  type SubscriptionData,
  type PaymentHistory,
  type AccessStatus
} from '@/actions/userprofileAPI';

import {
  createPortalSession,
  cancelSubscription
} from '@/actions/stripeAPI';

// Types
interface DashboardData {
  profile: UserProfile | null;
  subscription: SubscriptionData | null;
  payments: PaymentHistory['payments'];
  accessStatus: AccessStatus | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, userProfile: contextProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    profile: null,
    subscription: null,
    payments: [],
    accessStatus: null
  });

  // Authentication check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Load dashboard data using context profile
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user || !contextProfile) return;

      try {
        setLoading(true);
        setError(null);

        // Use context profile as initial data
        setDashboardData(prev => ({
          ...prev,
          profile: contextProfile
        }));

        // Load additional data in parallel
        const [subscriptionData, paymentData, accessData] = await Promise.all([
          getUserSubscription(),
          getPaymentHistory(),
          getAccessStatus()
        ]);

        setDashboardData(prev => ({
          ...prev,
          subscription: subscriptionData,
          payments: paymentData.payments,
          accessStatus: accessData
        }));
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (user && contextProfile) {
      loadDashboardData();
    }
  }, [user, contextProfile]);

  // Loading states
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null; // Router will handle redirect
  }

  // Handle subscription management
  const handleManageSubscription = async () => {
    try {
      setError(null);
      const url = await createPortalSession();
      window.location.href = url;
    } catch (error) {
      console.error('Error managing subscription:', error);
      setError('Failed to open subscription management. Please try again.');
    }
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;
    
    try {
      setError(null);
      await cancelSubscription();
      // Refresh dashboard data after cancellation
      window.location.reload();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      setError('Failed to cancel subscription. Please try again.');
    }
  };

  const { profile, subscription, payments, accessStatus } = dashboardData;

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
          {subscription && accessStatus && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600">Status</p>
                  <p className="font-medium capitalize">
                    {subscription.status || 'No active subscription'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Access</p>
                  <p className={`font-medium ${accessStatus.has_access ? 'text-green-600' : 'text-red-600'}`}>
                    {accessStatus.has_access ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>

              {subscription.current_period_end && (
                <div>
                  <p className="text-gray-600">Current Period Ends</p>
                  <p className="font-medium">
                    {new Date(subscription.current_period_end * 1000).toLocaleDateString()}
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
                {subscription.status === 'active' && !subscription.cancel_at_period_end && (
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
          {payments.length > 0 ? (
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
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(payment.created * 1000).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        ${(payment.amount / 100).toFixed(2)}
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
