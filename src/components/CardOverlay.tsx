'use client'

import { useCard } from '@/stores/optimizedGameStore'

interface DebuffOverlayItemProps {
  cardId: string
  side: 'player' | 'opponent'
  screenPosition: { x: number; y: number }
}

function DebuffOverlayItem({ cardId, side, screenPosition }: DebuffOverlayItemProps) {
  const card = useCard(side, cardId)

  // Only render if card exists, is alive, and has debuffs
  if (!card || card.hp <= 0 || card.debuffs.length === 0) return null

  const debuffs = {
    isFrozen: card.debuffs.some(d => d.type === 'frozen'),
    isBurned: card.debuffs.some(d => d.type === 'burned'),
    isPoisoned: card.debuffs.some(d => d.type === 'poisoned'),
    isStunned: card.debuffs.some(d => d.type === 'stunned'),
    hasFireAura: card.debuffs.find(d => d.type === 'fire_aura')
  }

  const fireAuraStacks = debuffs.hasFireAura?.stacks || 0

  return (
    <div
      className="absolute pointer-events-none transition-all duration-200"
      style={{
        left: `${screenPosition.x}px`,
        top: `${screenPosition.y}px`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="flex gap-1 bg-black/70 px-2 py-1 rounded">
        {debuffs.isFrozen && <span className="text-cyan-300 text-base">❄️</span>}
        {debuffs.isBurned && <span className="text-orange-400 text-base">🔥</span>}
        {debuffs.hasFireAura && (
          <div className="flex items-center gap-0.5">
            <span className="text-orange-600 text-base">🔥</span>
            {fireAuraStacks > 1 && <span className="text-xs font-bold text-white">{fireAuraStacks}</span>}
          </div>
        )}
        {debuffs.isPoisoned && <span className="text-green-400 text-base">☠️</span>}
        {debuffs.isStunned && <span className="text-yellow-400 text-base">⚡</span>}
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
        <DebuffOverlayItem
          key={`${card.side}-${card.cardId}`}
          cardId={card.cardId}
          side={card.side}
          screenPosition={card.screenPosition}
        />
      ))}
    </div>
  )
}