import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { freezeVertexShader, freezeFragmentShader } from '@/shaders/freezeShader'
import { fireVertexShader, fireFragmentShader } from '@/shaders/fireShader'

interface EffectProps {
  type: 'freeze' | 'fire' | 'lightning' | 'heal' | 'poison'
  position: [number, number, number]
  targetPositions?: [number, number, number][]
  duration?: number
  onComplete?: () => void
}

export function SpellEffect({ type, position, targetPositions = [], duration = 2, onComplete }: EffectProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const startTime = useRef(Date.now())

  const particleCount = type === 'freeze' ? 100 : type === 'fire' ? 80 : 50

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3)
    const vel = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      if (type === 'freeze' || type === 'fire') {
        const angle = (Math.PI * 2 * i) / particleCount
        const radius = Math.random() * 2
        pos[i3] = Math.cos(angle) * radius
        pos[i3 + 1] = Math.random() * 2
        pos[i3 + 2] = Math.sin(angle) * radius

        vel[i3] = (Math.random() - 0.5) * 0.02
        vel[i3 + 1] = Math.random() * 0.05
        vel[i3 + 2] = (Math.random() - 0.5) * 0.02
      } else {
        pos[i3] = (Math.random() - 0.5) * 2
        pos[i3 + 1] = Math.random() * 2
        pos[i3 + 2] = (Math.random() - 0.5) * 2

        vel[i3] = (Math.random() - 0.5) * 0.05
        vel[i3 + 1] = Math.random() * 0.1
        vel[i3 + 2] = (Math.random() - 0.5) * 0.05
      }
    }

    return { positions: pos, velocities: vel }
  }, [type, particleCount])

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
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        uniforms: {
          time: { value: 0 },
          opacity: { value: 1 }
        }
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
    if (!meshRef.current) return

    const elapsed = (Date.now() - startTime.current) / 1000
    const progress = elapsed / duration

    if (progress >= 1) {
      if (onComplete) onComplete()
      return
    }

    const dummy = new THREE.Object3D()

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3

      dummy.position.set(
        positions[i3] + velocities[i3] * elapsed * 10,
        positions[i3 + 1] + velocities[i3 + 1] * elapsed * 10,
        positions[i3 + 2] + velocities[i3 + 2] * elapsed * 10
      )

      const scale = 1 - progress * 0.5
      dummy.scale.set(scale, scale, scale)

      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }

    meshRef.current.instanceMatrix.needsUpdate = true

    if (shaderMaterial instanceof THREE.ShaderMaterial) {
      shaderMaterial.uniforms.time.value = elapsed
      shaderMaterial.uniforms.opacity.value = 1 - progress
    }
  })

  useEffect(() => {
    return () => {
      shaderMaterial.dispose()
    }
  }, [shaderMaterial])

  return (
    <group position={position}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, particleCount]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        {shaderMaterial}
      </instancedMesh>

      {type === 'freeze' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 3, 32]} />
          <meshBasicMaterial color="#00aaff" opacity={0.3} transparent />
        </mesh>
      )}

      {type === 'fire' && (
        <pointLight color="#ff6600" intensity={2} distance={5} />
      )}
    </group>
  )
}