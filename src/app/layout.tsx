import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { Toaster } from '@/components/ui/sonner'
import BrutalNavbar from '@/components/brutal/BrutalNavbar'
import ProfileCompletionGate from '@/components/ProfileCompletionGate'
import { ReactQueryProvider } from '@/lib/react-query/provider'
import { RealtimeListener } from '@/components/providers/realtime-listener'
import './globals.css'
import { ReactLenis } from '@/lib/lenis'

export const metadata: Metadata = {
  title: 'Kiwikoo - AI Fashion Try-On Marketplace',
  description: 'AI-powered platform connecting influencers and brands with virtual try-on capabilities.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const fontVars = {
    ['--font-playfair' as string]: 'Playfair Display, Georgia, Cambria, "Times New Roman", serif',
    ['--font-inter' as string]: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    ['--font-geist-sans' as string]: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    ['--font-geist-mono' as string]: '"SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  } as CSSProperties

  return (
    <html lang="en">
      <body className="antialiased bg-cream text-charcoal" style={fontVars}>
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
