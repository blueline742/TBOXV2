import { useRef, useLayoutEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { InstancedMesh, Object3D, Mesh } from 'three'
import * as THREE from 'three'

interface InstancedToyMixProps {
  duckCount?: number
  dinoCount?: number
}

export function InstancedToyMix({ duckCount = 5, dinoCount = 2 }: InstancedToyMixProps) {
  const duckInstancedRef = useRef<InstancedMesh>(null)
  const dinoInstancedRef = useRef<InstancedMesh>(null)

  // Load both models (cached by useGLTF)
  const { scene: duckScene } = useGLTF('/toy_duck.glb')
  const { scene: dinoScene } = useGLTF('/models/stuffed_dino_toy.glb')

  // Extract geometry and material from duck
  const duckData = useMemo(() => {
    let foundGeometry: THREE.BufferGeometry | null = null
    let foundMaterial: THREE.Material | null = null

    duckScene.traverse((child) => {
      if (child instanceof Mesh && !foundGeometry) {
        foundGeometry = child.geometry
        foundMaterial = child.material
      }
    })

    return { geometry: foundGeometry, material: foundMaterial }
  }, [duckScene])

  // Extract geometry and material from dino
  const dinoData = useMemo(() => {
    let foundGeometry: THREE.BufferGeometry | null = null
    let foundMaterial: THREE.Material | null = null

    dinoScene.traverse((child) => {
      if (child instanceof Mesh && !foundGeometry) {
        foundGeometry = child.geometry
        foundMaterial = child.material
      }
    })

    return { geometry: foundGeometry, material: foundMaterial }
  }, [dinoScene])

  // Generate positions for all toys (ducks + dinos mixed around the circle)
  const positions = useMemo(() => {
    const totalCount = duckCount + dinoCount
    const pos = []

    // Create array indicating which positions are ducks vs dinos
    const types = [
      ...Array(duckCount).fill('duck'),
      ...Array(dinoCount).fill('dino')
    ]

    // Shuffle to mix them up
    types.sort(() => Math.random() - 0.5)

    for (let i = 0; i < totalCount; i++) {
      const angle = (i / totalCount) * Math.PI * 2
      const radius = 5 + Math.random() * 0.3 // Reduced from 6-6.5 to 5-5.3 to keep inside walls
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const baseY = -0.8 + Math.random() * 0.2
      // Lower dinos a bit more than ducks
      const y = types[i] === 'dino' ? baseY - 0.2 : baseY

      pos.push({
        type: types[i],
        position: [x, y, z] as [number, number, number],
        rotation: types[i] === 'duck'
          ? [
              Math.PI / 2, // Ducks stand upright with this rotation
              Math.random() * Math.PI * 2,
              0
            ] as [number, number, number]
          : [
              0, // Dinos might need different rotation - try 0 first
              Math.random() * Math.PI * 2,
              0
            ] as [number, number, number],
        scale: types[i] === 'duck'
          ? (0.15 + Math.random() * 0.1) * 0.01 * 1.9 * 1.9
          : (0.15 + Math.random() * 0.1) * 0.01 * 1.9 * 1.9 // Same scale for now
      })
    }
    return pos
  }, [duckCount, dinoCount])

  // Initialize duck instances
  useLayoutEffect(() => {
    if (!duckInstancedRef.current || !duckData.geometry) return

    const temp = new Object3D()
    const duckPositions = positions.filter(p => p.type === 'duck')

    duckPositions.forEach((pos, i) => {
      const { position, rotation, scale } = pos
      temp.position.set(...position)
      temp.rotation.set(...rotation)
      temp.scale.setScalar(scale)
      temp.updateMatrix()

      duckInstancedRef.current!.setMatrixAt(i, temp.matrix)
    })

    duckInstancedRef.current.instanceMatrix.needsUpdate = true
  }, [positions, duckData.geometry])

  // Initialize dino instances
  useLayoutEffect(() => {
    if (!dinoInstancedRef.current || !dinoData.geometry) return

    const temp = new Object3D()
    const dinoPositions = positions.filter(p => p.type === 'dino')

    dinoPositions.forEach((pos, i) => {
      const { position, rotation, scale } = pos
      temp.position.set(...position)
      temp.rotation.set(...rotation)
      temp.scale.setScalar(scale)
      temp.updateMatrix()

      dinoInstancedRef.current!.setMatrixAt(i, temp.matrix)
    })

    dinoInstancedRef.current.instanceMatrix.needsUpdate = true
  }, [positions, dinoData.geometry])

  if (!duckData.geometry || !dinoData.geometry || !duckData.material || !dinoData.material) {
    return null
  }

  return (
    <>
      {/* Instanced ducks */}
      <instancedMesh
        ref={duckInstancedRef}
        args={[duckData.geometry, duckData.material, duckCount]}
        castShadow
        receiveShadow
      />

      {/* Instanced dinos */}
      <instancedMesh
        ref={dinoInstancedRef}
        args={[dinoData.geometry, dinoData.material, dinoCount]}
        castShadow
        receiveShadow
      />
    </>
  )
}

// Preload both models
useGLTF.preload('/toy_duck.glb')
useGLTF.preload('/models/stuffed_dino_toy.glb')
