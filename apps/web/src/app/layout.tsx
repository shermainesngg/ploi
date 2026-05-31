import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Space_Mono } from 'next/font/google'
import './globals.css'
import NavBar from '@/components/NavBar'
import { ThemeProvider } from '@/components/ThemeProvider'
import { getCurrentUser } from '@/lib/auth'

// Plus Jakarta Sans — primary typeface (headings, logo, body). Display + body share it.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

// Space Mono — data & system: earnings, prices, IDs, attribution, timestamps.
const spaceMono = Space_Mono({
  subsets: ['latin'],
  variable: '--font-data',
  display: 'swap',
  weight: ['400', '700'],
})

export const metadata: Metadata = {
  title: 'PLOI — Commerce infrastructure for creator-driven discovery',
  description: 'PLOI is the invisible layer that turns recommendations into bookings and rewards creators for the value they drive.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jakarta.variable} ${spaceMono.variable} font-sans bg-bridge-bg min-h-screen antialiased`}>
        <ThemeProvider>
          <NavBar user={user} />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
