import type { Metadata } from 'next'
import { Brygada_1918, Schibsted_Grotesk } from 'next/font/google'
import './globals.css'
import NavBar from '@/components/NavBar'
import { ThemeProvider } from '@/components/ThemeProvider'
import { getCurrentUser } from '@/lib/auth'

const displayFont = Brygada_1918({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const bodyFont = Schibsted_Grotesk({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
})

export const metadata: Metadata = {
  title: 'BRIDGE — Book what you discover',
  description: 'From content to booking in seconds. BRIDGE connects creator recommendations to local service bookings.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${displayFont.variable} ${bodyFont.variable} font-sans bg-bridge-bg min-h-screen antialiased`}>
        <ThemeProvider>
          <NavBar user={user} />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
