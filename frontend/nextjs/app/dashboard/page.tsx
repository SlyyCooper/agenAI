'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/config/firebase/AuthContext';
import axios from 'axios';
import Link from 'next/link';

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

const DashboardPage: React.FC = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }

    const fetchData = async () => {
      if (user) {
        try {
          const token = await user.getIdToken();
          const [userResponse, reportsResponse] = await Promise.all([
            axios.get<UserData>('https://dolphin-app-49eto.ondigitalocean.app/backend/user/profile', {
              headers: { Authorization: `Bearer ${token}` }
            }),
            axios.get<{ reports: Report[] }>('https://dolphin-app-49eto.ondigitalocean.app/backend/user/reports', {
              headers: { Authorization: `Bearer ${token}` }
            })
          ]);
          setUserData(userResponse.data);
          setReports(reportsResponse.data.reports);
        } catch (error) {
          console.error('Error fetching data:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchData();
  }, [user, loading, router]);

  if (loading || isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!userData) {
    return <div className="flex justify-center items-center h-screen">Error loading user data</div>;
  }

  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold gradient-text mb-6">Welcome to your Dashboard</h1>
      
      {/* User Account Information */}
      <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Your Account Information</h2>
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
