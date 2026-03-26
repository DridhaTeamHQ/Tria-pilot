import type { Metadata } from 'next'
import type React from 'react'
import { Bungee } from 'next/font/google'
import AuthToastBridge from '@/components/auth-toast-bridge'
import InitialSiteLoader from '@/components/initial-site-loader'
import { Toaster } from '@/components/ui/sonner'
import NavSwitcher from '@/components/landing/NavSwitcher'
import ProfileCompletionGate from '@/components/ProfileCompletionGate'
import { ReactQueryProvider } from '@/lib/react-query/provider'
import { RealtimeListener } from '@/components/providers/realtime-listener'
import './globals.css'
import { ReactLenis } from '@/lib/lenis'

const bungee = Bungee({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-bungee',
})

export const metadata: Metadata = {
  title: 'Kiwikoo - AI Fashion Try-On Marketplace',
  description: 'AI-powered platform connecting influencers and brands with virtual try-on capabilities.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
}

// Defined at module level so the object reference is stable across SSR and client,
// preventing React's hydration mismatch on the <body> style prop.
const FONT_VARS = {
  '--font-plus-jakarta-sans': 'var(--font-bungee), "Arial Black", Impact, sans-serif',
  '--font-playfair': 'var(--font-bungee), "Arial Black", Impact, sans-serif',
  '--font-inter': 'var(--font-bungee), "Arial Black", Impact, sans-serif',
  '--font-geist-sans': 'var(--font-bungee), "Arial Black", Impact, sans-serif',
  '--font-geist-mono': '"SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  '--font-bungee': 'Bungee, "Arial Black", Impact, sans-serif',
} as React.CSSProperties

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bungee.variable} antialiased bg-cream text-charcoal`} style={FONT_VARS} suppressHydrationWarning>
        <ReactQueryProvider>
          <Toaster />
          <AuthToastBridge />
          <ReactLenis>
            <NavSwitcher />
            <RealtimeListener />
            <ProfileCompletionGate />
            <main className="animate-fade-in">
              {children}
            </main>
          </ReactLenis>
          <InitialSiteLoader />
        </ReactQueryProvider>
      </body>
    </html>
  )
}
