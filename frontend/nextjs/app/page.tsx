'use client' // Indicates that this is a client-side component

// Importing necessary dependencies and components
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Brain, BarChart, Zap, PieChart, TrendingUp, LineChart } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { auth } from '@/config/firebase/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import Image from 'next/image'

export default function Home() {
  // State to track scroll position
  const [scrollY, setScrollY] = useState(0)

  // Effect to handle scroll events
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    // Cleanup function to remove event listener
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900">
      {/* Header with navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white bg-opacity-90 backdrop-blur-md">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/TAN.png"
              alt="TANgent Logo"
              width={40}
              height={40}
              priority
            />
          </Link>
          {/* Navigation links */}
          <div className="space-x-6">
            <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
            <Link href="/plans" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</Link>
            <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors">About</a>
          </div>
          {/* Login and Sign Up buttons */}
          <div className="space-x-4">
            <Link href="/login" className="text-gray-600 hover:text-gray-900 transition-colors">
              Login
            </Link>
            <Link href="/signup" className="bg-black text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors">
              Sign Up
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero section */}
        <section className="pt-32 pb-20 px-6">
          <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center">
            {/* Left column with text content */}
            <div>
              <motion.h1 
                className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                AI-Powered<br />Insights at Your<br />Fingertips
              </motion.h1>
              <motion.p 
                className="text-xl md:text-2xl text-gray-600 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                Harness the power of multi-agent AI for unparalleled data analysis and decision-making support.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <GetStartedButton />
              </motion.div>
            </div>
            {/* Right column with animated visual */}
            <div className="relative">
              {/* Animated background */}
              <motion.div 
                className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl absolute top-0 left-0 filter blur-3xl opacity-20"
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 90, 0],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
              />
              {/* Main visual content */}
              <div className="bg-white rounded-2xl p-4 shadow-2xl relative z-10 overflow-hidden">
                <div className="relative w-full h-96 mb-4">
                  <Image
                    src="/tangents.png"
                    alt="TANgent AI Visualization"
                    fill
                    sizes="100%"
                    style={{ objectFit: 'cover' }}
                    className="rounded-xl"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-30"></div>
                </div>
                {/* Feature icons */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Data Analysis icon */}
                  <motion.div
                    className="flex flex-col items-center bg-blue-50 p-2 rounded-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <PieChart className="w-8 h-8 text-blue-600 mb-1" />
                    <p className="text-xs font-semibold text-center text-blue-800">Data Analysis</p>
                  </motion.div>
                  {/* Predictive Modeling icon */}
                  <motion.div
                    className="flex flex-col items-center bg-green-50 p-2 rounded-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <TrendingUp className="w-8 h-8 text-green-600 mb-1" />
                    <p className="text-xs font-semibold text-center text-green-800">Predictive Modeling</p>
                  </motion.div>
                  {/* Market Trends icon */}
                  <motion.div
                    className="flex flex-col items-center bg-purple-50 p-2 rounded-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                  >
                    <LineChart className="w-8 h-8 text-purple-600 mb-1" />
                    <p className="text-xs font-semibold text-center text-purple-800">Market Trends</p>
                  </motion.div>
                  {/* AI Insights icon */}
                  <motion.div
                    className="flex flex-col items-center bg-red-50 p-2 rounded-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                  >
                    <Brain className="w-8 h-8 text-red-600 mb-1" />
                    <p className="text-xs font-semibold text-center text-red-800">AI Insights</p>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features section */}
        <section id="features" className="py-20 px-6">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center">Powerful AI-Driven Features</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Map through feature items */}
              {[
                { icon: Brain, title: "Advanced Analytics", description: "Leverage our multi-agent AI system for deep, nuanced analysis of complex data sets." },
                { icon: BarChart, title: "Predictive Insights", description: "Gain forward-looking perspectives with our AI-powered predictive modeling." },
                { icon: Zap, title: "Real-time Adaptation", description: "Our AI continuously learns and adapts, providing up-to-the-minute insights for your business." }
              ].map((feature, index) => (
                <motion.div 
                  key={index}
                  className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <feature.icon className="w-12 h-12 text-blue-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* About section */}
        <section id="about" className="py-20 px-6">
          <div className="container mx-auto">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-4xl font-bold mb-6">Revolutionizing Decision-Making with AI</h2>
              <p className="text-xl text-gray-600 mb-8">
                At TANgent, we&apos;ve harnessed the power of multi-agent AI systems to provide unparalleled insights for businesses. Our cutting-edge technology processes complex data sets, identifies patterns, and generates actionable recommendations to drive your success.
              </p>
              <a 
                href="#" 
                className="text-blue-600 font-semibold hover:text-blue-800 transition-colors inline-flex items-center"
              >
                Learn more about our technology
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </div>
          </div>
        </section>

        {/* Call-to-action section */}
        <section className="py-20 px-6 bg-gray-900 text-white">
          <div className="container mx-auto text-center">
            <h2 className="text-4xl font-bold mb-8">Ready to Transform Your Decision-Making?</h2>
            <p className="text-xl mb-12 max-w-2xl mx-auto">
              Join the AI revolution and unlock the full potential of your data with TANgent&apos;s multi-agent AI analysis.
            </p>
            <Link 
              href="/signup" 
              className="bg-white text-gray-900 px-8 py-4 rounded-full text-lg font-semibold inline-flex items-center hover:bg-gray-100 transition-colors"
            >
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}

// Component for the "Get Started" button
function GetStartedButton() {
  const router = useRouter();
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Effect to check authentication status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setLoadingAuth(false);
    });

    // Cleanup function to unsubscribe from the auth listener
    return () => unsubscribe();
  }, []);

  // Function to handle button click
  const handleClick = () => {
    if (isAuthenticated) {
      router.push('/research');
    } else {
      router.push('/signup');
    }
  };

  // Don't render anything while checking auth status
  if (loadingAuth) {
    return null; // Or a loading spinner
  }

  return (
    <button
      onClick={handleClick}
      className="bg-black text-white px-8 py-4 rounded-full text-lg font-semibold inline-flex items-center hover:bg-gray-800 transition-colors"
    >
      Get Started
      <ArrowRight className="ml-2 h-5 w-5" />
    </button>
  );
}
