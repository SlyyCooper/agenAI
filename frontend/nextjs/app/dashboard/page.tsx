'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/config/firebase/AuthContext';
import Link from 'next/link';
import { getUserProfile, getUserReports, getUserSubscription, getUserPaymentHistory, cancelUserSubscription } from '@/actions/apiActions';

interface UserData {
  email: string;
  stripe_customer_id?: string;
  subscription_status?: string;
  subscription_plan?: string;
  subscription_start_date?: string;
  subscription_current_period_end?: string;
  total_amount_paid?: number;
  reports_generated?: number;
  last_payment_date?: string;
  last_payment_amount?: number;
}

interface Report {
  id: string;
  task: string;
  type: string;
  created_at: string;
}

interface Subscription {
  status: string;
  plan: string;
  current_period_end: number;
  cancel_at_period_end: boolean;
}

interface PaymentHistory {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
}

const DashboardPage: React.FC = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshData = () => {
    setRefreshKey(oldKey => oldKey + 1);
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }

    const fetchData = async () => {
      if (user) {
        setIsLoading(true);
        setErrors({});
        try {
          const token = await user.getIdToken();
          const [userProfileData, userReportsData, userSubscription, userPaymentHistory] = await Promise.all([
            getUserProfile(token).catch(e => { setErrors(prev => ({...prev, profile: e.message})); return null; }),
            getUserReports(token).catch(e => { setErrors(prev => ({...prev, reports: e.message})); return {reports: []}; }),
            getUserSubscription(token).catch(e => { setErrors(prev => ({...prev, subscription: e.message})); return null; }),
            getUserPaymentHistory(token).catch(e => { setErrors(prev => ({...prev, paymentHistory: e.message})); return {payment_history: []}; })
          ]);
          if (userProfileData) setUserData(userProfileData);
          if (userReportsData) setReports(userReportsData.reports);
          if (userSubscription) setSubscription(userSubscription);
          if (userPaymentHistory) setPaymentHistory(userPaymentHistory.payment_history);
        } catch (error) {
          console.error('Error fetching data:', error);
          setErrors(prev => ({...prev, general: 'Failed to fetch user data'}));
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchData();
  }, [user, loading, router, refreshKey]);

  const handleCancelSubscription = async () => {
    if (user) {
      try {
        const token = await user.getIdToken();
        await cancelUserSubscription(token);
        refreshData();  // Refresh data after cancellation
      } catch (error) {
        console.error('Error cancelling subscription:', error);
        setErrors(prev => ({...prev, subscription: 'Failed to cancel subscription'}));
      }
    }
  };

  if (loading || isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold gradient-text">Welcome to your Dashboard</h1>
        <button 
          onClick={refreshData}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Refresh Data
        </button>
      </div>
      
      {errors.general && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {errors.general}</span>
        </div>
      )}

      {/* User Account Information */}
      <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Your Account Information</h2>
        {errors.profile ? (
          <p className="text-red-500">Error loading profile: {errors.profile}</p>
        ) : userData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">Email:</p>
              <p className="font-medium">{userData.email}</p>
            </div>
            <div>
              <p className="text-gray-600">Subscription Status:</p>
              <p className="font-medium">{userData.subscription_status || 'No active subscription'}</p>
            </div>
            {userData.subscription_plan && (
              <div>
                <p className="text-gray-600">Current Plan:</p>
                <p className="font-medium">{userData.subscription_plan}</p>
              </div>
            )}
            {userData.subscription_current_period_end && (
              <div>
                <p className="text-gray-600">Next Billing Date:</p>
                <p className="font-medium">{new Date(userData.subscription_current_period_end).toLocaleDateString()}</p>
              </div>
            )}
            <div>
              <p className="text-gray-600">Total Amount Paid:</p>
              <p className="font-medium">${(userData.total_amount_paid || 0) / 100}</p>
            </div>
            <div>
              <p className="text-gray-600">Reports Generated:</p>
              <p className="font-medium">{userData.reports_generated || 0}</p>
            </div>
            {userData.last_payment_date && (
              <div>
                <p className="text-gray-600">Last Payment Date:</p>
                <p className="font-medium">{new Date(userData.last_payment_date).toLocaleDateString()}</p>
              </div>
            )}
            {userData.last_payment_amount && (
              <div>
                <p className="text-gray-600">Last Payment Amount:</p>
                <p className="font-medium">${userData.last_payment_amount / 100}</p>
              </div>
            )}
          </div>
        ) : (
          <p>No user data available.</p>
        )}
      </div>

      {/* Subscription Information */}
      <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Your Subscription</h2>
        {errors.subscription ? (
          <p className="text-red-500">Error loading subscription: {errors.subscription}</p>
        ) : subscription ? (
          <div>
            <p>Status: {subscription.status}</p>
            <p>Plan: {subscription.plan}</p>
            <p>Next billing date: {new Date(subscription.current_period_end * 1000).toLocaleDateString()}</p>
            {subscription.cancel_at_period_end ? (
              <p>Your subscription will end on the next billing date.</p>
            ) : (
              <button
                onClick={handleCancelSubscription}
                className="bg-red-500 text-white px-4 py-2 rounded mt-2 hover:bg-red-600 transition-colors"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        ) : (
          <div>
            <p>You don&apos;t have an active subscription.</p>
            <Link href="/plans" className="text-blue-500 hover:underline">
              View available plans
            </Link>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Payment History</h2>
        {paymentHistory.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {paymentHistory.map((payment) => (
              <li key={payment.id} className="py-4">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">${payment.amount / 100} {payment.currency.toUpperCase()}</p>
                    <p className="text-sm text-gray-500">{payment.status}</p>
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(payment.created * 1000).toLocaleDateString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No payment history available.</p>
        )}
      </div>

      {/* Recent Reports */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Your Recent Reports</h2>
        {reports.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {reports.map((report) => (
              <li key={report.id} className="py-4">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">{report.task}</p>
                    <p className="text-sm text-gray-500">{report.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {new Date(report.created_at).toLocaleDateString()}
                    </p>
                    <Link href={`/report/${report.id}`} className="text-blue-500 hover:underline">
                      View Report
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>You haven&apos;t generated any reports yet.</p>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
