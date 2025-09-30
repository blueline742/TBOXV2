import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { useGamePhase, useCurrentTurn } from '@/stores/optimizedGameStore'

export function DynamicCamera() {
  const { camera } = useThree()
  const phase = useGamePhase()
  const currentTurn = useCurrentTurn()

  // Camera positions
  const basePosition = useRef(new Vector3(0, 6, 7)) // Default view - more zoomed in
  const closeUpPosition = useRef(new Vector3(0, 3, 5)) // Close-up view of entire board
  const targetPosition = useRef(new Vector3(0, 6, 7))
  const targetLookAt = useRef(new Vector3(0, 0, 0))

  // Animation state
  const prevTurn = useRef(currentTurn)
  const isTransitioning = useRef(false)
  const orbitAngle = useRef(0)

  useEffect(() => {
    // Turn change detected
    if (prevTurn.current !== currentTurn && phase !== 'setup' && !isTransitioning.current) {
      isTransitioning.current = true

      if (currentTurn === 'opponent') {
        // Opponent's turn - zoom in close to see all cards
        targetPosition.current.copy(closeUpPosition.current)
        targetLookAt.current.set(0, 0, 0) // Look at center of board

        // Reset orbit angle
        orbitAngle.current = 0

        setTimeout(() => {
          isTransitioning.current = false
        }, 800)
      } else {
        // Player's turn - return to normal view
        targetPosition.current.copy(basePosition.current)
        targetLookAt.current.set(0, 0, 0) // Look at center

        setTimeout(() => {
          isTransitioning.current = false
        }, 800)
      }
    }
    prevTurn.current = currentTurn
  }, [currentTurn, phase])

  useFrame((state, delta) => {
    // Smooth transition to target position
    if (isTransitioning.current) {
      camera.position.lerp(targetPosition.current, 0.06)

      const currentLookAt = new Vector3()
      camera.getWorldDirection(currentLookAt)
      currentLookAt.add(camera.position)
      currentLookAt.lerp(targetLookAt.current, 0.06)
      camera.lookAt(currentLookAt)
    }

    // Slow orbit when viewing all cards during opponent turn (not during transition)
    if (currentTurn === 'opponent' && !isTransitioning.current) {
      orbitAngle.current += delta * 0.2 // Slow rotation speed

      // Calculate orbit position (circular path around board)
      const radius = 5
      const orbitX = Math.sin(orbitAngle.current) * radius
      const orbitZ = Math.cos(orbitAngle.current) * radius

      // Allow user to control Y (zoom) while maintaining X/Z orbit
      // Only override X and Z, let OrbitControls handle Y
      camera.position.x = orbitX
      camera.position.z = orbitZ

      // Keep Y within reasonable bounds (user can zoom in/out)
      camera.position.y = Math.max(2, Math.min(10, camera.position.y))

      camera.lookAt(0, 0, 0) // Always look at center to see both rows
    }
  })

  return null
}