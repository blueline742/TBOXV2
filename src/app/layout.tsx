import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SolanaWalletProvider } from '@/contexts/WalletProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Toy Card Battle',
  description: '4v4 Turn-based toy card battle game',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SolanaWalletProvider>
          {children}
        </SolanaWalletProvider>
      </body>
    </html>
  )
}