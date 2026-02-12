import type { Metadata } from 'next'
import { Toaster } from '@/components/ui/sonner'
import BrutalNavbar from '@/components/brutal/BrutalNavbar'
import ProfileCompletionGate from '@/components/ProfileCompletionGate'
import { ReactQueryProvider } from '@/lib/react-query/provider'
import { RealtimeListener } from '@/components/providers/realtime-listener'
import './globals.css'
import { Playfair_Display, Inter } from 'next/font/google'
import { ReactLenis } from '@/lib/lenis'

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: 'swap', // Faster font loading
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap', // Faster font loading
});

export const metadata: Metadata = {
  title: 'Kiwikoo - AI Fashion Try-On Marketplace',
  description: 'AI-powered platform connecting influencers and brands with virtual try-on capabilities.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${inter.variable} antialiased bg-cream text-charcoal`}>
        <ReactQueryProvider>
          <Toaster />
          <ReactLenis>
            <BrutalNavbar />
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
