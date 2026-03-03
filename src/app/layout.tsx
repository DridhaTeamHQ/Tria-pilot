import type { Metadata } from 'next'
import type React from 'react'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import NavSwitcher from '@/components/landing/NavSwitcher'
import ProfileCompletionGate from '@/components/ProfileCompletionGate'
import { ReactQueryProvider } from '@/lib/react-query/provider'
import { RealtimeListener } from '@/components/providers/realtime-listener'
import './globals.css'
import { ReactLenis } from '@/lib/lenis'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
})

export const metadata: Metadata = {
  title: 'Kiwikoo - AI Fashion Try-On Marketplace',
  description: 'AI-powered platform connecting influencers and brands with virtual try-on capabilities.',
}

// Defined at module level so the object reference is stable across SSR and client,
// preventing React's hydration mismatch on the <body> style prop.
const FONT_VARS = {
  '--font-playfair': 'Playfair Display, Georgia, Cambria, "Times New Roman", serif',
  '--font-inter': 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
  '--font-geist-sans': 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
  '--font-geist-mono': '"SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
} as React.CSSProperties

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={plusJakartaSans.variable} suppressHydrationWarning>
      <body className="antialiased bg-cream text-charcoal" style={FONT_VARS} suppressHydrationWarning>
        <ReactQueryProvider>
          <Toaster />
          <ReactLenis>
            <NavSwitcher />
            <RealtimeListener />
            <ProfileCompletionGate />
            <main className="animate-fade-in">
              {children}
            </main>
          </ReactLenis>
        </ReactQueryProvider>
      </body>
    </html>
  )
}
