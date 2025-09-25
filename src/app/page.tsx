'use client'

import dynamic from 'next/dynamic'
import { GameUI } from '@/components/GameUI'

const GameScene = dynamic(() => import('@/components/GameScene').then(mod => mod.GameScene), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-blue-900 to-purple-900">
      <div className="text-white text-2xl">Loading Game...</div>
    </div>
  )
})

export default function Home() {
  return (
    <main className="w-full h-screen relative bg-gradient-to-b from-blue-900 to-purple-900">
      <GameScene />
      <GameUI />
    </main>
  )
}