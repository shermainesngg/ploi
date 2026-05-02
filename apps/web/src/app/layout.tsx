import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import NavBar from '@/components/NavBar'
import { getCurrentUser } from '@/lib/auth'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
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
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-stone-50 min-h-screen`}>
        <NavBar user={user} />
        {children}
      </body>
    </html>
  )
}
