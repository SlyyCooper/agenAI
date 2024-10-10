'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Brain, BarChart, Zap, PieChart, TrendingUp, LineChart } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { auth } from '@/config/firebase/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import Image from 'next/image'

export default function Home() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white bg-opacity-90 backdrop-blur-md">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <Image
              src="/TAN.png"
              alt="TANgent Logo"
              width={40}
              height={40}
              priority
            />
          </Link>
          <div className="space-x-6">
            <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
            <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors">About</a>
          </div>
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
        <section className="pt-32 pb-20 px-6">
          <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center">
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
            <div className="relative">
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
              <div className="bg-white rounded-2xl p-4 shadow-2xl relative z-10 overflow-hidden">
                <div className="relative w-full h-96 mb-4"> {/* Increased height significantly */}
                  <Image
                    src="/tangents.png"
                    alt="TANgent AI Visualization"
                    fill
                    sizes="100%"
                    style={{ objectFit: 'cover' }}
                    className="rounded-xl"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-30"></div> {/* Reduced opacity */}
                </div>
                <div className="grid grid-cols-2 gap-2"> {/* Reduced gap */}
                  <motion.div
                    // Reduced padding
                    className="flex flex-col items-center bg-blue-50 p-2 rounded-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <PieChart className="w-8 h-8 text-blue-600 mb-1" /> {/* Reduced icon size */}
                    <p className="text-xs font-semibold text-center text-blue-800">Data Analysis</p>
                  </motion.div>
                  <motion.div
                    className="flex flex-col items-center bg-green-50 p-2 rounded-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <TrendingUp className="w-8 h-8 text-green-600 mb-1" />
                    <p className="text-xs font-semibold text-center text-green-800">Predictive Modeling</p>
                  </motion.div>
                  <motion.div
                    className="flex flex-col items-center bg-purple-50 p-2 rounded-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                  >
                    <LineChart className="w-8 h-8 text-purple-600 mb-1" />
                    <p className="text-xs font-semibold text-center text-purple-800">Market Trends</p>
                  </motion.div>
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

        <section id="features" className="py-20 px-6">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center">Powerful AI-Driven Features</h2>
            <div className="grid md:grid-cols-3 gap-8">
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

        <section id="pricing" className="py-20 px-6 bg-gray-50">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center">Flexible Pricing Options</h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-white p-8 rounded-xl shadow-lg">
                <h3 className="text-2xl font-bold mb-4">Per Report</h3>
                <p className="text-gray-600 mb-4">Perfect for one-time insights or occasional use.</p>
                <p className="text-4xl font-bold mb-6">$499<span className="text-xl text-gray-600 font-normal">/report</span></p>
                <ul className="mb-8 space-y-2">
                  <li className="flex items-center"><ArrowRight className="mr-2 h-5 w-5 text-green-500" /> Comprehensive AI analysis</li>
                  <li className="flex items-center"><ArrowRight className="mr-2 h-5 w-5 text-green-500" /> Customized insights</li>
                  <li className="flex items-center"><ArrowRight className="mr-2 h-5 w-5 text-green-500" /> 30-day support</li>
                </ul>
                <button className="w-full bg-black text-white px-4 py-2 rounded-full font-semibold hover:bg-gray-800 transition-colors">
                  Get Started
                </button>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-blue-500">
                <h3 className="text-2xl font-bold mb-4">Subscription</h3>
                <p className="text-gray-600 mb-4">For ongoing insights and continuous support.</p>
                <p className="text-4xl font-bold mb-6">$1,999<span className="text-xl text-gray-600 font-normal">/month</span></p>
                <ul className="mb-8 space-y-2">
                  <li className="flex items-center"><ArrowRight className="mr-2 h-5 w-5 text-green-500" /> Unlimited AI-powered reports</li>
                  <li className="flex items-center"><ArrowRight className="mr-2 h-5 w-5 text-green-500" /> Real-time data updates</li>
                  <li className="flex items-center"><ArrowRight className="mr-2 h-5 w-5 text-green-500" /> Priority support</li>
                  <li className="flex items-center"><ArrowRight className="mr-2 h-5 w-5 text-green-500" /> Customized AI models</li>
                </ul>
                <button className="w-full bg-blue-500 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-600 transition-colors">
                  Subscribe Now
                </button>
              </div>
            </div>
          </div>
        </section>

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

        <section className="py-20 px-6 bg-gray-900 text-white">
          <div className="container mx-auto text-center">
            <h2 className="text-4xl font-bold mb-8">Ready to Transform Your Decision-Making?</h2>
            <p className="text-xl mb-12 max-w-2xl mx-auto">
              Join the AI revolution and unlock the full potential of your data with TANgent&apos;s multi-agent AI analysis.
            </p>
            <a 
              href="#" 
              className="bg-white text-gray-900 px-8 py-4 rounded-full text-lg font-semibold inline-flex items-center hover:bg-gray-100 transition-colors"
            >
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}

function GetStartedButton() {
  const router = useRouter();
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const handleClick = () => {
    if (isAuthenticated) {
      router.push('/research');
    } else {
      router.push('/login');
    }
  };

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