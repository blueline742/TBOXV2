'use client'

import { useEffect, useState } from 'react'
import { useCard } from '@/stores/optimizedGameStore'

interface CardOverlayItemProps {
  cardId: string
  side: 'player' | 'opponent'
  screenPosition: { x: number; y: number }
}

function CardOverlayItem({ cardId, side, screenPosition }: CardOverlayItemProps) {
  const card = useCard(side, cardId)

  if (!card || card.hp <= 0) return null

  const debuffs = {
    isFrozen: card.debuffs.some(d => d.type === 'frozen'),
    isBurned: card.debuffs.some(d => d.type === 'burned'),
    isPoisoned: card.debuffs.some(d => d.type === 'poisoned'),
    isStunned: card.debuffs.some(d => d.type === 'stunned')
  }

  return (
    <div
      className="absolute pointer-events-none transition-all duration-100"
      style={{
        left: `${screenPosition.x}px`,
        top: `${screenPosition.y}px`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="flex flex-col items-center gap-1">
        <div className="bg-black/80 px-2 py-1 rounded text-white text-xs font-bold">
          {card.name}
        </div>

        {/* HP Display */}
        <div className="bg-black/90 px-2 py-1 rounded-lg">
          <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-green-500 transition-all duration-300"
              style={{ width: `${(card.hp / card.maxHp) * 100}%` }}
            />
          </div>
          <div className="text-white text-xs text-center mt-1">
            {card.hp}/{card.maxHp} HP
          </div>
        </div>

        {/* Debuff Icons */}
        {card.debuffs.length > 0 && (
          <div className="flex gap-1 bg-black/70 px-2 py-1 rounded">
            {debuffs.isFrozen && <span className="text-cyan-300 text-xs">❄️</span>}
            {debuffs.isBurned && <span className="text-orange-400 text-xs">🔥</span>}
            {debuffs.isPoisoned && <span className="text-green-400 text-xs">☠️</span>}
            {debuffs.isStunned && <span className="text-yellow-400 text-xs">⚡</span>}
          </div>
        )}
      </div>
    </div>
  )
}

export interface CardPosition {
  cardId: string
  side: 'player' | 'opponent'
  screenPosition: { x: number; y: number }
}

interface CardOverlayProps {
  cards: CardPosition[]
}

export function CardOverlay({ cards }: CardOverlayProps) {
  if (cards.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 10 }}>
      {cards.map(card => (
        <CardOverlayItem
          key={`${card.side}-${card.cardId}`}
          cardId={card.cardId}
          side={card.side}
          screenPosition={card.screenPosition}
        />
      ))}
    </div>
  )
}