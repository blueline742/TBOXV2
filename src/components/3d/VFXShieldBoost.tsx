import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface VFXShieldBoostProps {
  position: [number, number, number]
  onComplete?: () => void
}

/**
 * Robot Guardian's Shield Boost - Dark blue glowing shield
 * Performance-optimized hexagonal shield with dark blue glow
 */
export function VFXShieldBoost({ position, onComplete }: VFXShieldBoostProps) {
  const shieldRef = useRef<THREE.Mesh>(null)
  const particlesRef = useRef<THREE.Points>(null)
  const startTime = useRef(Date.now())
  const duration = 1500 // 1.5s animation

  // Create hexagonal shield geometry
  const shieldGeometry = useMemo(() => {
    const geometry = new THREE.SphereGeometry(1.2, 6, 4) // Hexagonal approximation
    return geometry
  }, [])

  // Shimmer particles around shield - dark blue themed
  const particles = useMemo(() => {
    const particleCount = 30
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2
      const radius = 1.3
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2
      positions[i * 3 + 2] = Math.sin(angle) * radius

      // Dark blue colors (R, G, B)
      colors[i * 3] = 0.0 + Math.random() * 0.2     // R - very low
      colors[i * 3 + 1] = 0.2 + Math.random() * 0.3 // G - low-medium
      colors[i * 3 + 2] = 0.8 + Math.random() * 0.2 // B - high (dark blue)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    return geometry
  }, [])

  useFrame(() => {
    const elapsed = Date.now() - startTime.current
    const progress = Math.min(elapsed / duration, 1)

    if (shieldRef.current) {
      // Pulse animation - expand then fade
      if (progress < 0.3) {
        // Expand phase (0 -> 1.0 scale)
        const scaleProgress = progress / 0.3
        const scale = 0.6 + scaleProgress * 0.4
        shieldRef.current.scale.setScalar(scale)

        // Fade in
        const material = shieldRef.current.material as THREE.MeshBasicMaterial
        material.opacity = scaleProgress * 0.7 // Slightly higher opacity for glow
      } else {
        // Hold then fade phase
        const fadeProgress = (progress - 0.3) / 0.7
        const material = shieldRef.current.material as THREE.MeshBasicMaterial
        material.opacity = 0.7 * (1 - fadeProgress * 0.5)
      }

      // Shimmer rotation
      shieldRef.current.rotation.y += 0.02
      shieldRef.current.rotation.x = Math.sin(elapsed * 0.003) * 0.1
    }

    if (particlesRef.current) {
      // Spiral particle animation
      particlesRef.current.rotation.y = (elapsed * 0.001) % (Math.PI * 2)

      // Fade particles
      const material = particlesRef.current.material as THREE.PointsMaterial
      if (progress < 0.3) {
        material.opacity = progress / 0.3
      } else {
        material.opacity = 1 - ((progress - 0.3) / 0.7)
      }
    }

    // Complete animation
    if (progress >= 1 && onComplete) {
      onComplete()
    }
  })

  return (
    <group position={position}>
      {/* Main shield bubble - dark blue */}
      <mesh ref={shieldRef} geometry={shieldGeometry}>
        <meshBasicMaterial
          color="#1a4d8f"  // Dark blue
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Hexagonal wireframe - glowing blue */}
      <mesh geometry={shieldGeometry}>
        <meshBasicMaterial
          color="#2563eb"  // Bright blue for wireframe
          wireframe
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Shimmer particles - dark blue theme */}
      <points ref={particlesRef} geometry={particles}>
        <pointsMaterial
          size={0.08}
          vertexColors
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      {/* Inner glow - dark blue */}
      <mesh>
        <sphereGeometry args={[0.9, 16, 16]} />
        <meshBasicMaterial
          color="#3b82f6"  // Medium blue glow
          transparent
          opacity={0.25}  // Stronger glow
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Outer glow ring for extra effect */}
      <mesh>
        <sphereGeometry args={[1.3, 16, 16]} />
        <meshBasicMaterial
          color="#1e3a8a"  // Deep blue
          transparent
          opacity={0.15}
          side={THREE.FrontSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
