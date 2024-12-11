import './globals.css'
import { Inter } from 'next/font/google'
import { Metadata } from 'next'
import PlausibleProvider from "next-plausible"
import { AuthProvider } from '@/config/firebase/AuthContext'
import NavBar from '@/components/ui/NavBar'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Providers } from '@/providers'
import { Analytics } from '@/components/analytics'
import { TailwindIndicator } from '@/components/tailwind-indicator'

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

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>
        <Providers>
          {children}
          <Analytics />
          <TailwindIndicator />
        </Providers>
      </body>
    </html>
  )
}
