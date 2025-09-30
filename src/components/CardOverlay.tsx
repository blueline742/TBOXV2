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
    hasFireAura: card.debuffs.find(d => d.type === 'fire_aura'),
    shieldDebuff: card.debuffs.find(d => d.type === 'shielded')
  }

  const fireAuraStacks = debuffs.hasFireAura?.stacks || 0
  const shieldAmount = debuffs.shieldDebuff?.shieldAmount || 0

  return (
    <div
      className="absolute pointer-events-none transition-all duration-200"
      style={{
        left: `${screenPosition.x}px`,
        top: `${screenPosition.y}px`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="flex gap-1.5 bg-black/80 px-2.5 py-1.5 rounded-lg shadow-lg border border-white/10">
        {/* Shield buff - Prominent display */}
        {debuffs.shieldDebuff && shieldAmount > 0 && (
          <div className="flex items-center gap-1 bg-blue-500/20 px-1.5 py-0.5 rounded border border-cyan-400/50">
            <span className="text-cyan-300 text-lg drop-shadow-[0_0_4px_rgba(0,255,255,0.8)]">🛡️</span>
            <span className="text-sm font-bold text-cyan-100 drop-shadow-[0_0_2px_rgba(0,255,255,0.6)]">{shieldAmount}</span>
          </div>
        )}

        {/* Debuffs */}
        {debuffs.isFrozen && <span className="text-cyan-300 text-base drop-shadow-[0_0_4px_rgba(0,255,255,0.8)]">❄️</span>}
        {debuffs.isBurned && <span className="text-orange-400 text-base drop-shadow-[0_0_4px_rgba(255,100,0,0.8)]">🔥</span>}
        {debuffs.hasFireAura && (
          <div className="flex items-center gap-0.5">
            <span className="text-orange-600 text-base drop-shadow-[0_0_4px_rgba(255,50,0,0.8)]">🔥</span>
            {fireAuraStacks > 1 && <span className="text-xs font-bold text-white drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]">{fireAuraStacks}</span>}
          </div>
        )}
        {debuffs.isPoisoned && <span className="text-green-400 text-base drop-shadow-[0_0_4px_rgba(0,255,0,0.8)]">☠️</span>}
        {debuffs.isStunned && <span className="text-yellow-400 text-base drop-shadow-[0_0_4px_rgba(255,255,0,0.8)]">⚡</span>}
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