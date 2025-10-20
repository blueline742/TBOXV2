'use client'

import { useRef, useEffect } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface TorchProps {
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
}

export function Torch({ position, rotation = [0, 0, 0], scale = 1 }: TorchProps) {
  const group = useRef<THREE.Group>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  const { scene, animations } = useGLTF('/torch.glb')
  const { actions } = useAnimations(animations, group)

  // Start torch animation on mount
  useEffect(() => {
    console.log('Torch animations available:', animations)
    console.log('Torch actions:', actions)
    if (actions && Object.keys(actions).length > 0) {
      // Play all animations in the GLB
      Object.values(actions).forEach(action => {
        console.log('Playing animation:', action)
        action?.play()
      })
    } else {
      console.log('No animations found in torch.glb')
    }
  }, [actions, animations])

  // Flicker the light intensity for realistic flame effect
  useFrame((state) => {
    if (lightRef.current) {
      const flicker = Math.sin(state.clock.elapsedTime * 8) * 0.1 + Math.sin(state.clock.elapsedTime * 15) * 0.05
      lightRef.current.intensity = 1.5 + flicker
    }
  })

  return (
    <group ref={group} position={position} rotation={rotation} scale={scale}>
      <primitive object={scene.clone()} />

      {/* Flickering point light from torch flame */}
      <pointLight
        ref={lightRef}
        position={[0, 1.5, 0]}
        color="#ff6600"
        intensity={1.5}
        distance={8}
        decay={2}
        castShadow
      />
    </group>
  )
}

// Preload the model
useGLTF.preload('/torch.glb')
