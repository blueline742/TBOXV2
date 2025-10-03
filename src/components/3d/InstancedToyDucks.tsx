import { useRef, useLayoutEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { InstancedMesh, Object3D, MeshStandardMaterial, Mesh } from 'three'
import * as THREE from 'three'

interface InstancedToyDucksProps {
  count?: number
}

export function InstancedToyDucks({ count = 20 }: InstancedToyDucksProps) {
  const instancedRef = useRef<InstancedMesh>(null)

  // Load the duck model once (cached by useGLTF)
  const { scene } = useGLTF('/toy_duck.glb')

  // Extract geometry and material from the loaded model
  const { geometry, material } = useMemo(() => {
    let foundGeometry: THREE.BufferGeometry | null = null
    let foundMaterial: THREE.Material | null = null

    scene.traverse((child) => {
      if (child instanceof Mesh && !foundGeometry) {
        foundGeometry = child.geometry
        foundMaterial = child.material
      }
    })

    return { geometry: foundGeometry, material: foundMaterial }
  }, [scene])

  // Generate positions once
  const positions = useMemo(() => {
    const pos = []
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const radius = 6 + Math.random() * 0.5
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const y = -0.8 + Math.random() * 0.2

      pos.push({
        position: [x, y, z] as [number, number, number],
        rotation: [
          Math.PI / 2, // Rotate 90 degrees on X axis to stand upright
          Math.random() * Math.PI * 2, // Random Y rotation (spin around)
          0 // No tilt on Z axis
        ] as [number, number, number],
        scale: (0.15 + Math.random() * 0.1) * 0.01 * 1.9 * 1.9 // 99% smaller, +20%, then +90%
      })
    }
    return pos
  }, [count])

  // Initialize instances
  useLayoutEffect(() => {
    if (!instancedRef.current || !geometry) return

    const temp = new Object3D()

    for (let i = 0; i < count; i++) {
      const { position, rotation, scale } = positions[i]
      temp.position.set(...position)
      temp.rotation.set(...rotation)
      temp.scale.setScalar(scale)
      temp.updateMatrix()

      instancedRef.current.setMatrixAt(i, temp.matrix)
    }

    instancedRef.current.instanceMatrix.needsUpdate = true
  }, [count, positions, geometry])

  if (!geometry || !material) {
    // Fallback to simple box while loading
    return null
  }

  return (
    <instancedMesh
      ref={instancedRef}
      args={[geometry, material, count]}
      castShadow
      receiveShadow
    />
  )
}

// Preload the model
useGLTF.preload('/toy_duck.glb')
