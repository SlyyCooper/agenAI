// Import necessary styles, fonts, and components
import './globals.css'
import { Inter } from 'next/font/google'
import { Metadata } from 'next'
import PlausibleProvider from "next-plausible"
import { AuthProvider } from '@/config/firebase/AuthContext'
import UserProfileButton from '@/components/profile/UserProfileButton'
import Link from 'next/link'
import Image from 'next/image'

// Initialize the Inter font with Latin subset
const inter = Inter({ subsets: ['latin'] })

// Define base URL and metadata for the application
let url = "https://Tanalyze.com"
let ogimage = "/favicon.ico"
let sitename = "TANgent"

// Define metadata for SEO and social sharing
export const metadata: Metadata = {
  metadataBase: new URL(url),
  title: 'TANgent - Multi-Agent AI Research',
  description: 'TANgent is pioneering the next generation of collaborative AI systems through cutting-edge multi-agent research.',
  keywords: ['AI', 'Artificial Intelligence', 'Multi-Agent Systems', 'Research', 'Machine Learning'],
  icons: {
    icon: "/favicon.ico",
  },
  // Open Graph metadata for rich link previews
  openGraph: {
    images: [ogimage],
    title: 'TANgent - Multi-Agent AI Research',
    description: 'TANgent is pioneering the next generation of collaborative AI systems through cutting-edge multi-agent research.',
    url: url,
    siteName: sitename,
    locale: "en_US",
    type: "website",
  },
  // Twitter Card metadata for Twitter link previews
  twitter: {
    card: "summary_large_image",
    images: [ogimage],
    title: 'TANgent - Multi-Agent AI Research',
    description: 'TANgent is pioneering the next generation of collaborative AI systems through cutting-edge multi-agent research.',
  },
}

// Root layout component that wraps all pages
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Plausible analytics integration */}
        <PlausibleProvider domain="localhost:3000" />
      </head>
      {/* Wrap the entire application with AuthProvider for authentication context */}
      <AuthProvider>
        <body className={`${inter.className} min-h-screen flex flex-col bg-white text-gray-900`}>
          <div className="flex flex-col min-h-screen">
            {/* Header with navigation */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white bg-opacity-90 backdrop-blur-md shadow-sm">
              <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
                {/* Logo linking to home page */}
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
                <div className="space-x-6 flex items-center">
                  <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Home
                  </Link>
                  <Link href="/research" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Research
                  </Link>
                  <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Dashboard
                  </Link>
                  {/* User profile button component */}
                  <UserProfileButton />
                </div>
              </nav>
            </header>

            {/* Main content area */}
            <main className="flex-grow mt-16 pt-8">
              {children}
            </main>

            {/* Footer */}
            <footer className="bg-gray-100 py-8 px-6">
              <div className="container mx-auto text-center text-gray-600">
                <p>&copy; {new Date().getFullYear()} TANgent. All rights reserved.</p>
              </div>
            </footer>
          </div>
        </body>
      </AuthProvider>
    </html>
  )
}
