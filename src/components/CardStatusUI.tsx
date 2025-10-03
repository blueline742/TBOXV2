'use client'

import { useMemo, useState } from 'react'
import useOptimizedGameStore from '@/stores/optimizedGameStore'
import { CardData } from '@/stores/cardStore'

export function CardStatusUI() {
  const playerCardsMap = useOptimizedGameStore(state => state.playerCards)
  const opponentCardsMap = useOptimizedGameStore(state => state.opponentCards)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const playerCards = useMemo(() => Array.from(playerCardsMap.values()), [playerCardsMap])
  const opponentCards = useMemo(() => Array.from(opponentCardsMap.values()), [opponentCardsMap])

  return (
    <div
      className={`fixed left-0 top-1/2 -translate-y-1/2 z-50 transition-transform duration-300 ${
        isCollapsed ? '-translate-x-full' : 'translate-x-0'
      }`}
    >
      {/* Sidebar content */}
      <div className="bg-black/80 backdrop-blur-sm border-r-2 border-white/30 p-3 select-none pointer-events-auto">
        {/* Player Cards Status */}
        <div className="mb-4">
          <div className="text-xs text-green-400 font-bold mb-2">YOUR TEAM</div>
          <div className="flex flex-col gap-2">
            {playerCards.map(card => (
              <CardStatus key={card.id} card={card} />
            ))}
          </div>
        </div>

        {/* Opponent Cards Status */}
        <div>
          <div className="text-xs text-red-400 font-bold mb-2">ENEMY TEAM</div>
          <div className="flex flex-col gap-2">
            {opponentCards.map(card => (
              <CardStatus key={card.id} card={card} />
            ))}
          </div>
        </div>
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute left-full top-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-sm border-2 border-l-0 border-white/30 rounded-r-lg p-2 hover:bg-white/10 transition-colors pointer-events-auto"
      >
        <svg
          className={`w-4 h-4 text-white transition-transform duration-300 ${isCollapsed ? 'rotate-0' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}

function CardStatus({ card }: { card: CardData }) {
  const isDead = card.hp <= 0
  const shield = card.shield || 0


  // Get debuff/buff icons
  const debuffs = (card.debuffs || []).map(d => {
    switch (d.type) {
      case 'burned': return { icon: '🔥', stacks: d.stacks || 1 }
      case 'fire_aura': return { icon: '🔥', stacks: d.stacks || 1 }
      case 'frozen': return { icon: '❄️', stacks: 1 }
      case 'poisoned': return { icon: '☠️', stacks: d.stacks || 1 }
      case 'stunned': return { icon: '💫', stacks: 1 }
      case 'shielded': return { icon: '🛡️', stacks: d.shieldAmount || shield }
      case 'protected': return { icon: '✨', stacks: 1 }
      case 'weakened': return { icon: '⚠️', stacks: 1 }
      case 'wet': return { icon: '💧', stacks: 1 }
      default: return null
    }
  }).filter(Boolean)

  return (
    <div
      className={`
        bg-black/80 backdrop-blur-sm border-2 rounded-lg p-1.5
        transition-all duration-200
        ${isDead ? 'border-gray-600 opacity-50' : 'border-white/30'}
        ${shield > 0 ? 'ring-2 ring-blue-400/50' : ''}
      `}
      style={{ width: '80px' }}
    >
      {/* Card Name */}
      <div className={`text-[10px] font-bold truncate mb-0.5 ${
        card.name === 'Arch Wizard' ? 'text-red-500' :
        card.name === 'Dino' ? 'text-purple-500' :
        card.name === 'Robot Guardian' ? 'text-purple-500' :
        card.name === 'Toy Wizard' ? 'text-orange-500' :
        'text-white'
      }`}>
        {card.name}
      </div>

      {/* HP Bar */}
      <div className="mb-1">
        <div className="flex items-center justify-between text-[9px] mb-0.5">
          <span className="text-red-400 font-bold">HP</span>
          <span className="text-white font-bold">{card.hp}/{card.maxHp}</span>
        </div>
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isDead ? 'bg-gray-500' :
              card.hp > card.maxHp * 0.5 ? 'bg-green-500' :
              card.hp > card.maxHp * 0.25 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.max(0, (card.hp / card.maxHp) * 100)}%` }}
          />
        </div>
      </div>

      {/* Shield */}
      {shield > 0 && (
        <div className="mb-1">
          <div className="flex items-center justify-between text-[9px] mb-0.5">
            <span className="text-blue-400 font-bold">🛡️</span>
            <span className="text-blue-300 font-bold">{shield}</span>
          </div>
          <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-400 transition-all duration-300" style={{ width: '100%' }} />
          </div>
        </div>
      )}

      {/* Debuffs */}
      {debuffs.length > 0 && (
        <div className="flex gap-0.5 mt-1 flex-wrap">
          {debuffs.map((debuff, i) => (
            <div key={i} className="relative">
              <span className="text-xs">{debuff?.icon}</span>
              {debuff && debuff.stacks > 1 && (
                <span className="absolute -top-1 -right-1 text-[8px] font-bold text-white bg-black/80 rounded-full w-3 h-3 flex items-center justify-center">
                  {debuff.stacks}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
