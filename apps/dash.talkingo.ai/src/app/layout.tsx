import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Talkingo Admin',
  description: 'Admin dashboard for Talkingo — AI Language Conversation Partner',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
