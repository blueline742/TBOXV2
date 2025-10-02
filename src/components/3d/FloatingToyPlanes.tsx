import { useRef, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { Group, Mesh } from 'three'
import { useFrame } from '@react-three/fiber'

export function FloatingToyPlanes() {
  const groupRef = useRef<Group>(null)
  const leftPlaneRef = useRef<Group>(null)
  const rightPlaneRef = useRef<Group>(null)

  // Load the plane model once (cached by useGLTF)
  const { scene } = useGLTF('/models/toy_plane.glb')

  // Clone the scene for each plane instance
  const leftPlane = useMemo(() => scene.clone(), [scene])
  const rightPlane = useMemo(() => scene.clone(), [scene])

  // Animate the group with floating rotation (same as original dice animation)
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.5) * 0.1
      groupRef.current.rotation.y = clock.elapsedTime * 0.3
    }

    // Add wing dipping/banking animation (rotate on Z axis)
    if (leftPlaneRef.current) {
      leftPlaneRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.8) * 0.3
    }
    if (rightPlaneRef.current) {
      rightPlaneRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.8 + Math.PI) * 0.3 // Offset for variety
    }
  })

  return (
    <group ref={groupRef}>
      {/* Left plane (replaces yellow dice) */}
      <group ref={leftPlaneRef} position={[-5.5, -0.5, 0]} scale={0.072}>
        <primitive object={leftPlane} castShadow receiveShadow />
      </group>

      {/* Right plane (replaces red dice) */}
      <group ref={rightPlaneRef} position={[5.5, -0.5, 0]} scale={0.072} rotation={[0, Math.PI, 0]}>
        <primitive object={rightPlane} castShadow receiveShadow />
      </group>
    </group>
  )
}

// Preload the model
useGLTF.preload('/models/toy_plane.glb')
