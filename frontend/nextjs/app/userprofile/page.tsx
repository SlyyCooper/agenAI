'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/config/firebase/AuthContext';
import { User, Settings, FileText, CreditCard, Trash2 } from 'lucide-react';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileSettings from '@/components/profile/ProfileSettings';
import ResearchPapers from '@/components/dashboard/ResearchPapers';
import BillingSection from '@/components/profile/BillingSection';
import DeleteAccount from '@/components/profile/DeleteAccount';
import { Toaster, toast } from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './UserProfile.module.css';

// Loading component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
);

// Profile Content Component
const ProfileContent = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams?.get('tab') || 'profile');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab && tabs.some(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    // Update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabId);
    window.history.pushState({}, '', url);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  const customUser = {
    id: user.uid,
    name: user.displayName || 'User',
    email: user.email || '',
    avatar: user.photoURL || '',
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSettings user={customUser} />;
      case 'papers':
        return <ResearchPapers />;
      case 'billing':
        return <BillingSection user={customUser} />;
      case 'settings':
        return (
          <div className="space-y-8">
            <ProfileSettings user={customUser} />
            <DeleteAccount />
          </div>
        );
      default:
        return null;
    }
  };

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
          <div className={styles.profileSidebar}>
            <ProfileHeader />
            <nav className="mt-8">
              <ul className="space-y-2">
                {tabs.map((tab) => (
                  <li key={tab.id}>
                    <button
                      onClick={() => handleTabChange(tab.id)}
                      className={`${styles.tabButton} ${
                        activeTab === tab.id ? styles.activeTab : ''
                      }`}
                      aria-selected={activeTab === tab.id}
                      role="tab"
                    >
                      <tab.icon className="h-5 w-5" />
                      <span>{tab.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className={styles.contentArea}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              role="tabpanel"
            >
              {renderTabContent()}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Tabs configuration
const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'papers', label: 'Research Papers', icon: FileText },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// Main component with Suspense
export default function UserProfile() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProfileContent />
    </Suspense>
  );
}
