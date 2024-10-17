'use client'; // Indicates that this is a client-side component

// Importing necessary dependencies and components
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/config/firebase/AuthContext';
import { User, Settings, FileText, CreditCard, Trash2 } from 'lucide-react';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileSettings from '@/components/profile/ProfileSettings';
import ResearchPapers from '@/components/profile/ResearchPapers';
import BillingSection from '@/components/profile/BillingSection';
import DeleteAccount from '@/components/profile/DeleteAccount';
import { Toaster, toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import styles from './UserProfile.module.css';
import { getReports } from '@/config/firebase/backendService';

// Define the structure for the user object
interface CustomUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

// Define the tabs for the user profile page
const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'papers', label: 'Research Papers', icon: FileText },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// Main component for the user profile page
export default function UserProfile() {
  // Get user authentication data and loading state
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  // State for managing active tab and user's research papers
  const [activeTab, setActiveTab] = useState('profile');
  const [papers, setPapers] = useState<Array<{ id: string; title: string; date: string }>>([]);

  // Effect to redirect to login page if user is not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Effect to fetch user's research papers when user is available
  useEffect(() => {
    if (user) {
      // Fetch user's research papers
      getReports(user.uid)
        .then((reports) => {
          setPapers(reports.map((report: any) => ({
            id: report.id,
            title: report.title,
            date: report.createdAt
          })));
        })
        .catch((error) => {
          console.error('Error fetching reports:', error);
          toast.error('Failed to load research papers');
        });
    }
  }, [user]);

  // Show loading spinner while authentication state is being determined
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Return null if user is not authenticated (will be redirected by useEffect)
  if (!user) {
    return null;
  }

  // Create a custom user object with available user data
  const customUser: CustomUser = {
    id: user.uid,
    name: user.displayName || 'User',
    email: user.email || '',
    avatar: user.photoURL || '',
  };

  // Function to render the content of the active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSettings user={customUser} />;
      case 'papers':
        return <ResearchPapers papers={papers} />;
      case 'billing':
        return <BillingSection user={customUser} />;
      case 'settings':
        return (
          <div className="space-y-8">
            <ProfileSettings user={customUser} />
            <DeleteAccount user={customUser} />
          </div>
        );
      default:
        return null;
    }
  };

  // Render the user profile page
  return (
    <div className={styles.profileContainer}>
      <Toaster position="top-right" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={styles.profileCard}
      >
        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          {/* Sidebar with user info and navigation */}
          <div className={styles.profileSidebar}>
            <ProfileHeader user={customUser} />
            <nav className="mt-8">
              <ul className="space-y-2">
                {tabs.map((tab) => (
                  <li key={tab.id}>
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={`${styles.tabButton} ${
                        activeTab === tab.id ? styles.activeTab : ''
                      }`}
                    >
                      <tab.icon className="h-5 w-5" />
                      <span>{tab.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          {/* Main content area */}
          <div className={styles.contentArea}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {renderTabContent()}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
