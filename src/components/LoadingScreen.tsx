'use client'

import { useProgress } from '@react-three/drei'
import { useEffect, useState } from 'react'

export function LoadingScreen() {
  const { active, progress, errors, item, loaded, total } = useProgress()
  const [show, setShow] = useState(true)

  useEffect(() => {
    if (!active && progress === 100) {
      // Fade out after loading completes
      const timer = setTimeout(() => setShow(false), 500)
      return () => clearTimeout(timer)
    }
  }, [active, progress])

  if (!show) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-purple-900 via-blue-900 to-black transition-opacity duration-500 ${
        !active && progress === 100 ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="text-center">
        {/* Game Title */}
        <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mb-8 animate-pulse">
          TOY BOX BRAWL
        </h1>

        {/* Loading Bar Container */}
        <div className="w-96 h-4 bg-gray-800 rounded-full overflow-hidden border-2 border-yellow-600 shadow-lg">
          {/* Progress Bar */}
          <div
            className="h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Percentage and Status */}
        <div className="mt-4 text-white">
          <p className="text-2xl font-bold">{Math.round(progress)}%</p>
          <p className="text-sm text-gray-400 mt-2">
            Loading assets... {loaded} / {total}
          </p>
        </div>

        {/* Error Display */}
        {errors.length > 0 && (
          <div className="mt-4 text-red-400 text-sm">
            <p>Warning: Some assets failed to load</p>
          </div>
        )}
      </div>
    </div>
  )
}
