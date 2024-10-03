import './globals.css'
import { Inter } from 'next/font/google'
import { Metadata } from 'next'
import PlausibleProvider from "next-plausible"

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
      <body className={`${inter.className} min-h-screen flex flex-col bg-white text-gray-900`}>
        <div className="flex flex-col min-h-screen">
          <header className="fixed top-0 left-0 right-0 z-50 bg-white bg-opacity-90 backdrop-blur-md">
            <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
              <div className="text-2xl font-bold text-gray-900">TANgent</div>
              <div className="space-x-6">
                <a href="/" className="text-gray-600 hover:text-gray-900 transition-colors">Home</a>
              </div>
            </nav>
          </header>

          <main className="flex-grow">
            {children}
          </main>

          <footer className="bg-gray-100 py-8 px-6">
            <div className="container mx-auto text-center text-gray-600">
              <p>&copy; {new Date().getFullYear()} TANgent. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}