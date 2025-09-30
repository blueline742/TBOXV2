import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3, Euler } from 'three'
import { useGamePhase, useCurrentTurn } from '@/stores/optimizedGameStore'

export function DynamicCamera() {
  const { camera } = useThree()
  const phase = useGamePhase()
  const currentTurn = useCurrentTurn()

  // Camera positions for each player
  const playerPosition = useRef(new Vector3(0, 8, 10)) // Looking at player cards from front
  const opponentPosition = useRef(new Vector3(0, 8, -10)) // Looking at opponent cards from behind
  const targetPosition = useRef(new Vector3(0, 8, 10))
  const targetLookAt = useRef(new Vector3(0, 0, 0))

  // Previous turn tracking
  const prevTurn = useRef(currentTurn)
  const isAnimating = useRef(false)

  useEffect(() => {
    // Turn change detected - cinematic camera flip
    if (prevTurn.current !== currentTurn && phase !== 'setup' && !isAnimating.current) {
      isAnimating.current = true

      // Determine target position based on whose turn it is
      const newTarget = currentTurn === 'player'
        ? playerPosition.current.clone()
        : opponentPosition.current.clone()

      // Step 1: Zoom out and up for dramatic transition
      const midPosition = new Vector3(0, 12, 0) // High overhead view
      targetPosition.current.copy(midPosition)

      setTimeout(() => {
        // Step 2: Rotate to new perspective
        targetPosition.current.copy(newTarget)

        setTimeout(() => {
          isAnimating.current = false
        }, 600)
      }, 400)
    }
    prevTurn.current = currentTurn
  }, [currentTurn, phase])

  useFrame(() => {
    if (isAnimating.current) {
      // Smooth camera movement
      camera.position.lerp(targetPosition.current, 0.08)

      // Always look at center of table
      targetLookAt.current.set(0, 0, 0)
      camera.lookAt(targetLookAt.current)
    }
  })

  return null
}