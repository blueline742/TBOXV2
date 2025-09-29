'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'
import useOptimizedGameStore from '@/stores/optimizedGameStore'

const ClientWalletButton = dynamic(
  () => import('./ClientWalletButton'),
  {
    ssr: false,
    loading: () => (
      <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded">
        Connect Wallet
      </button>
    )
  }
)

export function WalletConnect() {
  const { publicKey, connected } = useWallet()
  const store = useOptimizedGameStore()

  useEffect(() => {
    if (connected && publicKey) {
      // Store the wallet address for player identification
      console.log('Wallet connected:', publicKey.toString())
      // We'll use this for multiplayer matchmaking
    }
  }, [connected, publicKey])

  return (
    <div className="fixed top-4 right-4 z-50">
      <ClientWalletButton />
      {connected && publicKey && (
        <div className="mt-2 text-white text-xs bg-black/50 rounded px-2 py-1">
          {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
        </div>
      )}
    </div>
  )
}