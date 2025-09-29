import { useRef, useMemo, useEffect, memo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { freezeVertexShader, freezeFragmentShader } from '@/shaders/freezeShader'
import { fireVertexShader, fireFragmentShader } from '@/shaders/fireShader'

interface EffectProps {
  type: 'freeze' | 'fire' | 'lightning' | 'heal' | 'poison'
  position: [number, number, number] // Source card position
  targetPosition?: [number, number, number] // Target card position
  duration?: number
  onComplete?: () => void
}

function SpellEffectComponent({ type, position, targetPosition, duration = 1.5, onComplete }: EffectProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const startTime = useRef<number | null>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  // Default position if undefined
  const safePosition = position || [0, 0, 0] as [number, number, number]

  // Set start time on mount
  useEffect(() => {
    startTime.current = Date.now()
    // console.log('[SPELL EFFECT] Created at:', startTime.current, { type, position, targetPosition })
  }, [])

  const particleCount = type === 'fire' ? 100 : type === 'freeze' ? 100 : 50

  const { initialPositions } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      if (type === 'fire') {
        const angle = (Math.PI * 2 * i) / particleCount
        const radius = Math.random() * 0.1 // Tight burst
        pos[i3] = safePosition[0] + Math.cos(angle) * radius
        pos[i3 + 1] = safePosition[1] + 0.5 // Exact card height
        pos[i3 + 2] = safePosition[2] + Math.sin(angle) * radius
      } else if (type === 'freeze') {
        const angle = (Math.PI * 2 * i) / particleCount
        const radius = Math.random() * 2
        pos[i3] = Math.cos(angle) * radius
        pos[i3 + 1] = Math.random() * 2
        pos[i3 + 2] = Math.sin(angle) * radius
      } else {
        pos[i3] = (Math.random() - 0.5) * 2
        pos[i3 + 1] = Math.random() * 2
        pos[i3 + 2] = (Math.random() - 0.5) * 2
      }
    }

    return { initialPositions: pos }
  }, [type, particleCount, safePosition, targetPosition])

  const shaderMaterial = useMemo(() => {
    if (type === 'freeze') {
      return new THREE.ShaderMaterial({
        vertexShader: freezeVertexShader,
        fragmentShader: freezeFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        uniforms: {
          time: { value: 0 },
          opacity: { value: 1 }
        }
      })
    } else if (type === 'fire') {
      return new THREE.ShaderMaterial({
        vertexShader: fireVertexShader,
        fragmentShader: fireFragmentShader,
        uniforms: { time: { value: 0 }, opacity: { value: 1 } },
        transparent: true,
        depthWrite: false,
        depthTest: false, // Allow drawing over table
        blending: THREE.AdditiveBlending,
      })
    } else {
      return new THREE.MeshBasicMaterial({
        color: type === 'lightning' ? '#ffff00' :
               type === 'heal' ? '#00ff00' :
               '#ff00ff',
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending
      })
    }
  }, [type])

  useFrame(() => {
    if (!meshRef.current || startTime.current === null) return

    const elapsed = (Date.now() - startTime.current) / 1000
    const progress = Math.min(elapsed / duration, 1.0)

    if (progress >= 1) {
      if (onComplete) {
        // console.log('[EFFECT DEBUG] Fire effect complete after', elapsed, 'seconds')
        onComplete()
      }
      return
    }

    const dummy = new THREE.Object3D()

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3

      if (type === 'fire') {
        if (targetPosition) {
          // Pure lerp from source to target
          const startPos = new THREE.Vector3(initialPositions[i3], initialPositions[i3 + 1], initialPositions[i3 + 2])
          const targetVec = new THREE.Vector3(...targetPosition)
          targetVec.y += 0.5 // Match target card height
          const finalPos = startPos.clone().lerp(targetVec, progress)

          // Minimal arc (slight upward mid-way)
          finalPos.y += Math.sin(progress * Math.PI) * 0.2 // Reduced peak

          dummy.position.copy(finalPos)

          // Slight spread for fireball look
          dummy.position.x += (Math.random() - 0.5) * 0.1 * (1 - progress)
          dummy.position.z += (Math.random() - 0.5) * 0.1 * (1 - progress)
        } else {
          // Fallback if no target - just expand outward
          dummy.position.set(
            initialPositions[i3] + (Math.random() - 0.5) * elapsed * 2,
            initialPositions[i3 + 1] + elapsed * 0.5,
            initialPositions[i3 + 2] + (Math.random() - 0.5) * elapsed * 2
          )
        }

        const scale = 1.2 - progress * 0.4 // Start bigger, shrink to point
        dummy.scale.set(scale, scale, scale)
      } else {
        dummy.position.set(
          initialPositions[i3] + (Math.random() - 0.5) * elapsed * 2,
          initialPositions[i3 + 1] + elapsed * 2,
          initialPositions[i3 + 2] + (Math.random() - 0.5) * elapsed * 2
        )

        const scale = 1 - progress * 0.5
        dummy.scale.set(scale, scale, scale)
      }

      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }

    meshRef.current.instanceMatrix.needsUpdate = true

    if (shaderMaterial instanceof THREE.ShaderMaterial) {
      shaderMaterial.uniforms.time.value = elapsed
      shaderMaterial.uniforms.opacity.value = 1 - progress
    }

    // Animate point light for fire effect
    if (type === 'fire' && lightRef.current) {
      lightRef.current.intensity = Math.sin(progress * Math.PI) * 5
    }
  })

  useEffect(() => {
    return () => {
      shaderMaterial.dispose()
    }
  }, [shaderMaterial])

  return (
    <group name={`spell-effect-${type}`}>
      <instancedMesh key="particles" ref={meshRef} args={[undefined, undefined, particleCount]} material={shaderMaterial}>
        <sphereGeometry args={[type === 'fire' ? 0.08 : 0.05, 6, 6]} />
      </instancedMesh>

      {type === 'freeze' && (
        <mesh key="freeze-ring" rotation={[-Math.PI / 2, 0, 0]} position={safePosition}>
          <ringGeometry args={[0.5, 3, 32]} />
          <meshBasicMaterial color="#00aaff" opacity={0.3} transparent />
        </mesh>
      )}

      {type === 'fire' && (
        <group key="fire-effects">
          <pointLight key="fire-light" ref={lightRef} color="#ff6600" intensity={5} distance={10} position={safePosition} />
          <mesh key="fire-sphere" position={safePosition}>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshBasicMaterial
              color="#ffaa00"
              opacity={0.8}
              transparent
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      )}
    </group>
  )
}

export const SpellEffect = memo(SpellEffectComponent)