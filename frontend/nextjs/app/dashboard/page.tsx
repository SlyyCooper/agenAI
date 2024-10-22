'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/config/firebase/AuthContext';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getUserSubscription, getUserPaymentHistory, cancelUserSubscription } from '@/actions/stripeAPI';
import { getUserProfile } from '@/actions/userprofileAPI';
import { getUserReports } from '@/actions/reportAPI';
import { Subscription } from '@/actions/stripeAPI';
import { 
  User, CreditCard, FileText, RefreshCw, AlertCircle, CheckCircle, XCircle, 
  DollarSign, Calendar, BarChart2, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

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
        toast.success('Subscription cancelled successfully');
        refreshData();
      } catch (error) {
        console.error('Error cancelling subscription:', error);
        toast.error('Failed to cancel subscription');
        setErrors(prev => ({...prev, subscription: 'Failed to cancel subscription'}));
      }
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw size={48} className="text-blue-500" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-12 bg-gray-50 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12"
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-gray-800">Welcome to your Dashboard</h1>
          <button 
            onClick={refreshData}
            className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition-colors flex items-center"
          >
            <RefreshCw size={18} className="mr-2" /> Refresh Data
          </button>
        </div>
        
        {errors.general && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <div className="flex">
              <AlertCircle className="flex-shrink-0 mr-2" />
              <span>{errors.general}</span>
            </div>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* User Account Information */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white shadow-lg rounded-lg p-6"
        >
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <User className="mr-2 text-blue-500" /> Your Account Information
          </h2>
          {errors.profile ? (
            <p className="text-red-500 flex items-center"><AlertCircle className="mr-2" /> {errors.profile}</p>
          ) : userData ? (
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center">
                <User className="mr-2 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Email:</p>
                  <p className="font-medium">{userData.email}</p>
                </div>
              </div>
              <div className="flex items-center">
                <CheckCircle className="mr-2 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Subscription Status:</p>
                  <p className="font-medium">{userData.subscription_status || 'No active subscription'}</p>
                </div>
              </div>
              {userData.subscription_plan && (
                <div className="flex items-center">
                  <CreditCard className="mr-2 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600">Current Plan:</p>
                    <p className="font-medium">{userData.subscription_plan}</p>
                  </div>
                </div>
              )}
              {userData.subscription_current_period_end && (
                <div className="flex items-center">
                  <Calendar className="mr-2 text-purple-500" />
                  <div>
                    <p className="text-sm text-gray-600">Next Billing Date:</p>
                    <p className="font-medium">{new Date(userData.subscription_current_period_end).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center">
                <DollarSign className="mr-2 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Total Amount Paid:</p>
                  <p className="font-medium">${(userData.total_amount_paid || 0) / 100}</p>
                </div>
              </div>
              <div className="flex items-center">
                <BarChart2 className="mr-2 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Reports Generated:</p>
                  <p className="font-medium">{userData.reports_generated || 0}</p>
                </div>
              </div>
              {userData.last_payment_date && (
                <div className="flex items-center">
                  <Clock className="mr-2 text-orange-500" />
                  <div>
                    <p className="text-sm text-gray-600">Last Payment Date:</p>
                    <p className="font-medium">{new Date(userData.last_payment_date).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
              {userData.last_payment_amount && (
                <div className="flex items-center">
                  <CreditCard className="mr-2 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-600">Last Payment Amount:</p>
                    <p className="font-medium">${userData.last_payment_amount / 100}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">No user data available.</p>
          )}
        </motion.div>

        {/* Subscription Information */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white shadow-lg rounded-lg p-6"
        >
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <CreditCard className="mr-2 text-blue-500" /> Your Subscription
          </h2>
          {errors.subscription ? (
            <p className="text-red-500 flex items-center"><AlertCircle className="mr-2" /> {errors.subscription}</p>
          ) : subscription ? (
            <div className="space-y-4">
              <div className="flex items-center">
                <CheckCircle className="mr-2 text-green-500" />
                <p><span className="font-medium">Status:</span> {subscription.status}</p>
              </div>
              {subscription.plan && (
                <div className="flex items-center">
                  <CreditCard className="mr-2 text-blue-500" />
                  <p><span className="font-medium">Plan:</span> {subscription.plan}</p>
                </div>
              )}
              <div className="flex items-center">
                <Calendar className="mr-2 text-purple-500" />
                <p><span className="font-medium">Next billing date:</span> {new Date(subscription.current_period_end * 1000).toLocaleDateString()}</p>
              </div>
              {subscription.cancel_at_period_end ? (
                <p className="text-orange-500 flex items-center">
                  <AlertCircle className="mr-2" /> Your subscription will end on the next billing date.
                </p>
              ) : (
                <button
                  onClick={handleCancelSubscription}
                  className="bg-red-500 text-white px-4 py-2 rounded-full mt-4 hover:bg-red-600 transition-colors flex items-center"
                >
                  <XCircle className="mr-2" /> Cancel Subscription
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-500">You don&apos;t have an active subscription.</p>
              <Link href="/plans" className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition-colors inline-flex items-center">
                <CreditCard className="mr-2" /> View available plans
              </Link>
            </div>
          )}
        </motion.div>

        {/* Payment History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="bg-white shadow-lg rounded-lg p-6 md:col-span-2"
        >
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <DollarSign className="mr-2 text-blue-500" /> Payment History
          </h2>
          {errors.paymentHistory ? (
            <p className="text-red-500 flex items-center"><AlertCircle className="mr-2" /> {errors.paymentHistory}</p>
          ) : paymentHistory.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {paymentHistory.map((payment) => (
                <li key={payment.id} className="py-4 flex justify-between items-center">
                  <div className="flex items-center">
                    <CreditCard className="mr-2 text-gray-500" />
                    <div>
                      <p className="font-medium">${payment.amount / 100} {payment.currency.toUpperCase()}</p>
                      <p className="text-sm text-gray-500">{payment.status}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(payment.created * 1000).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No payment history available.</p>
          )}
        </motion.div>

        {/* Recent Reports */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="bg-white shadow-lg rounded-lg p-6 md:col-span-2"
        >
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <FileText className="mr-2 text-blue-500" /> Your Recent Reports
          </h2>
          {errors.reports ? (
            <p className="text-red-500 flex items-center"><AlertCircle className="mr-2" /> {errors.reports}</p>
          ) : reports.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {reports.map((report) => (
                <li key={report.id} className="py-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <FileText className="mr-2 text-gray-500" />
                      <div>
                        <p className="font-medium">{report.task}</p>
                        <p className="text-sm text-gray-500">{report.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {new Date(report.created_at).toLocaleDateString()}
                      </p>
                      <Link href={`/report/${report.id}`} className="text-blue-500 hover:underline inline-flex items-center">
                        <FileText className="mr-1" size={16} /> View Report
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">You haven&apos;t generated any reports yet.</p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;
