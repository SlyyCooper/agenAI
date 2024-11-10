'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { Menu, X, Home, Search, LayoutDashboard } from 'lucide-react';
import UserProfileButton from '@/components/dashboard/UserProfileButton';
import { clsx } from 'clsx';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getUserProfile } from '@/api/userprofileAPI';
import type { UserProfileData } from '@/api/types/models';

// Define different nav items for authenticated and non-authenticated users
const publicNavItems = [
  { name: 'Home', href: '/', icon: Home },
];

const authenticatedNavItems = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Research', href: '/research', icon: Search },
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
];

export default function NavBar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsAuthenticated(!!user);
      if (user) {
        try {
          const profile = await getUserProfile();
          setUserProfile(profile);
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = isAuthenticated ? authenticatedNavItems : publicNavItems;

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={clsx(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled 
          ? 'bg-white/80 backdrop-blur-lg shadow-md'
          : 'bg-white'
      )}
    >
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Image
                src="/TAN.png"
                alt="TANgent Logo"
                width={40}
                height={40}
                priority
                className="rounded-lg"
              />
            </motion.div>
            <span className="hidden sm:block font-bold text-xl text-gray-900">
              TANgent
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200',
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.name}
                </Link>
              )}
            )}
            {isAuthenticated ? (
              <UserProfileButton />
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden"
            >
              <div className="px-2 pt-2 pb-3 space-y-1 bg-white rounded-lg shadow-lg mt-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <motion.div
                      key={item.name}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Link
                        href={item.href}
                        className={clsx(
                          'flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors duration-200',
                          isActive
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        )}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        {item.name}
                      </Link>
                    </motion.div>
                  );
                })}
                <div className="pt-4">
                  {isAuthenticated ? (
                    <UserProfileButton />
                  ) : (
                    <Link
                      href="/login"
                      className="w-full flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      Sign In
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
}