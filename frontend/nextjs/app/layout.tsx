import './globals.css'
import { Inter } from 'next/font/google'
import { Metadata } from 'next'
import PlausibleProvider from "next-plausible"
import { AuthProvider } from '@/config/firebase/AuthContext'
import NavBar from '@/components/ui/NavBar'

const inter = Inter({ subsets: ['latin'] })

let url = "https://Tanalyze.com"
let ogimage = "/favicon.ico"
let sitename = "TANgent"

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title: 'TANgent - Multi-Agent AI Research',
  description: 'TANgent is pioneering the next generation of collaborative AI systems through cutting-edge multi-agent research.',
  keywords: ['AI', 'Artificial Intelligence', 'Multi-Agent Systems', 'Research', 'Machine Learning'],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    images: [ogimage],
    title: 'TANgent - Multi-Agent AI Research',
    description: 'TANgent is pioneering the next generation of collaborative AI systems through cutting-edge multi-agent research.',
    url: url,
    siteName: sitename,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: [ogimage],
    title: 'TANgent - Multi-Agent AI Research',
    description: 'TANgent is pioneering the next generation of collaborative AI systems through cutting-edge multi-agent research.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <PlausibleProvider domain="localhost:3000" />
      </head>
      <AuthProvider>
        <body className={`${inter.className} min-h-screen flex flex-col bg-white text-gray-900`}>
          <div className="flex flex-col min-h-screen">
            <NavBar />
            <main className="flex-grow mt-16 pt-8">
              {children}
            </main>
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
