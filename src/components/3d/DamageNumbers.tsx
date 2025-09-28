import { useRef, useEffect, useState } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useCard } from '@/stores/optimizedGameStore'
import { CardData } from '@/stores/cardStore'

interface DamageNumber {
  id: string
  value: number
  type: 'damage' | 'heal' | 'critical'
  startTime: number
}

interface DamageNumbersProps {
  card: CardData
  position: [number, number, number]
  side: 'player' | 'opponent'
}

function FloatingNumber({
  number,
  onComplete
}: {
  number: DamageNumber
  onComplete: () => void
}) {
  const [opacity, setOpacity] = useState(1)
  const [yOffset, setYOffset] = useState(0)
  const startTime = useRef(Date.now())

  useFrame(() => {
    const elapsed = (Date.now() - startTime.current) / 1000 // Convert to seconds
    const duration = 2 // 2 seconds total

    if (elapsed >= duration) {
      onComplete()
      return
    }

    // Floating upward animation
    const newYOffset = elapsed * 1.5 // Move up 1.5 units per second
    setYOffset(newYOffset)

    // Fade out in the last half of the animation
    if (elapsed > duration / 2) {
      const fadeProgress = (elapsed - duration / 2) / (duration / 2)
      setOpacity(1 - fadeProgress)
    }
  })

  // Determine styles based on damage type
  const getStyles = () => {
    switch (number.type) {
      case 'damage':
        return {
          color: '#ff3333',
          bgColor: 'rgba(0, 0, 0, 0.8)',
          borderColor: '#ff0000',
          fontSize: '24px',
          prefix: '-'
        }
      case 'heal':
        return {
          color: '#33ff33',
          bgColor: 'rgba(0, 0, 0, 0.8)',
          borderColor: '#00ff00',
          fontSize: '24px',
          prefix: '+'
        }
      case 'critical':
        return {
          color: '#ffaa00',
          bgColor: 'rgba(50, 0, 0, 0.9)',
          borderColor: '#ff6600',
          fontSize: '32px',
          prefix: '-'
        }
    }
  }

  const styles = getStyles()

  return (
    <Html
      position={[0, 2 + yOffset, 0.5]}
      center
      distanceFactor={8}
      style={{
        opacity,
        transition: 'none',
        pointerEvents: 'none',
        userSelect: 'none'
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'inline-block'
        }}
      >
        {/* Speech bubble */}
        <div
          style={{
            background: styles.bgColor,
            border: `2px solid ${styles.borderColor}`,
            borderRadius: '20px',
            padding: '8px 16px',
            fontSize: styles.fontSize,
            fontWeight: 'bold',
            color: styles.color,
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
            fontFamily: '"Comic Sans MS", "Marker Felt", fantasy',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 8px rgba(0,0,0,0.5)',
            position: 'relative',
            animation: number.type === 'critical' ? 'pulse 0.5s ease-in-out' : 'none'
          }}
        >
          {styles.prefix}{Math.abs(number.value)}

          {/* Speech bubble tail */}
          <div
            style={{
              position: 'absolute',
              bottom: '-8px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: `8px solid ${styles.borderColor}`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-6px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `6px solid ${styles.bgColor}`,
            }}
          />
        </div>

        {/* Extra effects for critical hits */}
        {number.type === 'critical' && (
          <div
            style={{
              position: 'absolute',
              top: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '14px',
              color: '#ffff00',
              fontWeight: 'bold',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            }}
          >
            CRIT!
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </Html>
  )
}

export function DamageNumbers({ card: initialCard, position, side }: DamageNumbersProps) {
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([])
  const [previousHp, setPreviousHp] = useState(initialCard.hp)

  // Get the current card state from store
  const card = useCard(side, initialCard.id) || initialCard

  // Detect HP changes and create damage numbers
  useEffect(() => {
    if (card.hp !== previousHp) {
      const difference = previousHp - card.hp

      if (difference !== 0) {
        const newNumber: DamageNumber = {
          id: `${Date.now()}-${Math.random()}`,
          value: Math.abs(difference),
          type: difference > 0 ?
            (difference >= 30 ? 'critical' : 'damage') :
            'heal',
          startTime: Date.now()
        }

        setDamageNumbers(prev => [...prev, newNumber])
      }

      setPreviousHp(card.hp)
    }
  }, [card.hp, previousHp])

  const removeNumber = (id: string) => {
    setDamageNumbers(prev => prev.filter(n => n.id !== id))
  }

  return (
    <group position={position}>
      {damageNumbers.map(number => (
        <FloatingNumber
          key={number.id}
          number={number}
          onComplete={() => removeNumber(number.id)}
        />
      ))}
    </group>
  )
}