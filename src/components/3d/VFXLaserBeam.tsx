import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface VFXLaserBeamProps {
  sourcePosition: [number, number, number]
  targetPosition: [number, number, number]
  onComplete?: () => void
}

export function VFXLaserBeam({ sourcePosition, targetPosition, onComplete }: VFXLaserBeamProps) {
  const groupRef = useRef<THREE.Group>(null)
  const beamRef = useRef<THREE.Mesh>(null)
  const startTime = useRef(Date.now())
  const duration = 1.2 // Total animation duration in seconds

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.()
    }, duration * 1000)

    return () => clearTimeout(timer)
  }, [onComplete, duration])

  // Custom shader for the laser beam core
  const laserBeamMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        progress: { value: 0 },
        coreColor: { value: new THREE.Color(0x00ffff) }, // Cyan core
        glowColor: { value: new THREE.Color(0x0088ff) }  // Blue glow
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float progress;
        uniform vec3 coreColor;
        uniform vec3 glowColor;
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          // Radial gradient from center (bright) to edges (dim)
          float radialDist = length(vUv - vec2(0.5, 0.5)) * 2.0;

          // Core beam (very bright center)
          float core = 1.0 - smoothstep(0.0, 0.3, radialDist);

          // Outer glow
          float glow = 1.0 - smoothstep(0.3, 1.0, radialDist);

          // Animated energy pulses traveling along the beam
          float pulse = sin(vUv.y * 20.0 - time * 15.0) * 0.5 + 0.5;

          // Intensity flicker for energy feel
          float flicker = sin(time * 30.0) * 0.1 + 0.9;

          // Combine effects
          vec3 finalColor = mix(glowColor, coreColor, core);
          float intensity = (core * 2.0 + glow * 0.5) * pulse * flicker * progress;

          gl_FragColor = vec4(finalColor * intensity, intensity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  }, [])

  // Custom shader for particle sparkles along the beam
  const particleMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x00ddff) }
      },
      vertexShader: `
        uniform float time;
        attribute float randomOffset;
        varying float vAlpha;

        void main() {
          // Sparkle effect
          float sparkle = sin(time * 5.0 + randomOffset * 10.0) * 0.5 + 0.5;
          vAlpha = sparkle;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 8.0 * (1.0 + sparkle);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vAlpha;

        void main() {
          // Circular point
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          float alpha = (1.0 - dist * 2.0) * vAlpha;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  }, [])

  // Create sparkle particles along the beam
  const particleGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const particleCount = 50
    const positions = new Float32Array(particleCount * 3)
    const randomOffsets = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      // Distribute particles along the beam length
      positions[i * 3] = 0
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.1 // Small random offset
      positions[i * 3 + 2] = Math.random() // Along beam length
      randomOffsets[i] = Math.random()
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('randomOffset', new THREE.BufferAttribute(randomOffsets, 1))

    return geometry
  }, [])

  useFrame((state) => {
    if (!groupRef.current || !beamRef.current) return

    const elapsed = (Date.now() - startTime.current) / 1000
    const progress = Math.min(elapsed / duration, 1)

    // Update shader uniforms
    if (laserBeamMaterial.uniforms) {
      laserBeamMaterial.uniforms.time.value = elapsed
      laserBeamMaterial.uniforms.progress.value = progress < 0.1 ? progress * 10 : (progress > 0.9 ? (1 - progress) * 10 : 1) // Fade in/out
    }

    if (particleMaterial.uniforms) {
      particleMaterial.uniforms.time.value = elapsed
    }

    // Position and orient the beam from source to target
    const source = new THREE.Vector3(...sourcePosition)
    const target = new THREE.Vector3(...targetPosition)
    const direction = new THREE.Vector3().subVectors(target, source)
    const distance = direction.length()

    // Position at midpoint
    const midpoint = new THREE.Vector3().addVectors(source, target).multiplyScalar(0.5)
    groupRef.current.position.copy(midpoint)

    // Orient beam to point at target
    const lookAtMatrix = new THREE.Matrix4()
    lookAtMatrix.lookAt(source, target, new THREE.Vector3(0, 1, 0))
    const quaternion = new THREE.Quaternion()
    quaternion.setFromRotationMatrix(lookAtMatrix)
    groupRef.current.quaternion.copy(quaternion)

    // Scale beam to match distance
    if (beamRef.current) {
      beamRef.current.scale.set(0.15, 0.15, distance)
    }
  })

  return (
    <group ref={groupRef}>
      {/* Core laser beam cylinder */}
      <mesh ref={beamRef} material={laserBeamMaterial}>
        <cylinderGeometry args={[1, 1, 1, 8, 1]} />
      </mesh>

      {/* Outer glow beam (larger, more transparent) */}
      <mesh material={laserBeamMaterial} scale={[1.8, 1.8, 1]}>
        <cylinderGeometry args={[1, 1, 1, 8, 1]} />
      </mesh>

      {/* Sparkle particles along the beam */}
      <points geometry={particleGeometry} material={particleMaterial} />

      {/* Impact flash at target */}
      <mesh position={[0, 0, 0.5]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial
          color={0x00ffff}
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Muzzle flash at source */}
      <mesh position={[0, 0, -0.5]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial
          color={0x00ddff}
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Point lights for scene illumination */}
      <pointLight
        position={[0, 0, 0.5]}
        color={0x00ffff}
        intensity={3}
        distance={4}
      />
      <pointLight
        position={[0, 0, -0.5]}
        color={0x00aaff}
        intensity={2}
        distance={3}
      />
    </group>
  )
}
