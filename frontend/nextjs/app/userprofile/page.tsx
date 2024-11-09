'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/config/firebase/AuthContext';
import { User, Settings, FileText, CreditCard, Trash2 } from 'lucide-react';
import ProfileHeader from '@/components/dashboard/ProfileHeader';
import ProfileSettings from '@/components/dashboard/ProfileSettings';
import ResearchPapers from '@/components/dashboard/ResearchPapers';
import BillingSection from '@/components/dashboard/BillingSection';
import DeleteAccount from '@/components/dashboard/DeleteAccount';
import { Toaster, toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import styles from './UserProfile.module.css';

interface CustomUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'papers', label: 'Research Papers', icon: FileText },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function UserProfile() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [papers, setPapers] = useState<Array<{ id: string; title: string; date: string }>>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      // Fetch user's research papers (placeholder data)
      setPapers([
        { id: '1', title: 'AI in Healthcare', date: '2023-05-15' },
        { id: '2', title: 'Machine Learning Trends', date: '2023-07-22' },
      ]);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null; // The useEffect hook will redirect to login page
  }

  const customUser: CustomUser = {
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
