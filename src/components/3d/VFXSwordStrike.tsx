import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { VFXEmitter } from 'wawa-vfx'

interface VFXSwordStrikeProps {
  sourcePosition: [number, number, number]
  targetPosition: [number, number, number]
  casterId?: string
  onComplete?: () => void
}

export function VFXSwordStrike({ sourcePosition, targetPosition, onComplete }: VFXSwordStrikeProps) {
  const groupRef = useRef<THREE.Group>(null)
  const startTime = useRef(Date.now())
  const duration = 1.5 // Total animation duration

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.()
    }, duration * 1000)

    return () => clearTimeout(timer)
  }, [onComplete, duration])

  useFrame(() => {
    if (!groupRef.current) return

    const elapsed = (Date.now() - startTime.current) / 1000
    const progress = Math.min(elapsed / duration, 1)

    // Animation phases:
    // 0.0 - 0.4: Move to target (fast)
    // 0.4 - 0.5: Impact
    // 0.5 - 1.0: Return to source (slower)

    let currentPos: [number, number, number]

    if (progress < 0.4) {
      // Moving to target - ease out
      const t = progress / 0.4
      const eased = 1 - Math.pow(1 - t, 3) // Ease out cubic

      currentPos = [
        THREE.MathUtils.lerp(sourcePosition[0], targetPosition[0], eased),
        THREE.MathUtils.lerp(sourcePosition[1], targetPosition[1] + 0.5, eased), // Arc upward
        THREE.MathUtils.lerp(sourcePosition[2], targetPosition[2], eased)
      ]
    } else if (progress < 0.5) {
      // Impact moment - stay at target with shake
      const shake = (Math.random() - 0.5) * 0.1
      currentPos = [
        targetPosition[0] + shake,
        targetPosition[1] + shake,
        targetPosition[2] + shake
      ]
    } else {
      // Returning to source - ease in
      const t = (progress - 0.5) / 0.5
      const eased = Math.pow(t, 2) // Ease in quad

      currentPos = [
        THREE.MathUtils.lerp(targetPosition[0], sourcePosition[0], eased),
        THREE.MathUtils.lerp(targetPosition[1], sourcePosition[1], eased),
        THREE.MathUtils.lerp(targetPosition[2], sourcePosition[2], eased)
      ]
    }

    groupRef.current.position.set(currentPos[0], currentPos[1], currentPos[2])
  })

  const impactProgress = Math.max(0, Math.min((Date.now() - startTime.current) / 1000 - 0.4, 0.2)) / 0.2

  const elapsed = (Date.now() - startTime.current) / 1000
  const progress = Math.min(elapsed / duration, 1)

  // Calculate rotation for spinning sword effect
  const rotation = elapsed * 10 // Fast spin

  // Custom shader material for glowing sword
  const swordMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0xcccccc) },
        glowColor: { value: new THREE.Color(0xaaddff) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec2 vUv;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        uniform vec3 glowColor;
        varying vec3 vNormal;
        varying vec2 vUv;

        void main() {
          // Fresnel-like edge glow
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);

          // Animated energy pulse
          float pulse = sin(time * 5.0 + vUv.y * 10.0) * 0.3 + 0.7;

          vec3 finalColor = mix(color, glowColor, fresnel * pulse);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    })
  }, [])

  useFrame((state) => {
    if (swordMaterial.uniforms) {
      swordMaterial.uniforms.time.value = state.clock.elapsedTime
    }
  })

  return (
    <group ref={groupRef} position={sourcePosition} rotation={[0, 0, rotation]}>
      {/* Giant Sword Blade with custom shader */}
      <mesh position={[0, 0, 0]} material={swordMaterial}>
        <boxGeometry args={[0.3, 2.5, 0.1]} />
      </mesh>

      {/* Sword Tip (pointed) */}
      <mesh position={[0, 1.4, 0]}>
        <coneGeometry args={[0.15, 0.5, 4]} />
        <meshStandardMaterial
          color={0xaaaaaa}
          metalness={0.9}
          roughness={0.2}
          emissive={0xaaddff}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Sword Handle */}
      <mesh position={[0, -1.5, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.6, 8]} />
        <meshStandardMaterial
          color={0x8b4513}
          roughness={0.8}
        />
      </mesh>

      {/* Cross Guard */}
      <mesh position={[0, -1.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.8, 0.15, 0.15]} />
        <meshStandardMaterial
          color={0xffd700}
          metalness={0.9}
          roughness={0.3}
          emissive={0xffaa00}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Glowing energy aura around sword */}
      <mesh>
        <boxGeometry args={[0.6, 3, 0.3]} />
        <meshBasicMaterial
          color={0x88ccff}
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>

      {/* Sword slash trail particles */}
      <VFXEmitter
        emitter="swordSlash"
        autoStart={true}
        settings={{
          loop: false,
          duration: 0.6,
          nbParticles: 80,
          spawnMode: "burst",
          particlesLifetime: [0.3, 0.6],
          startPositionMin: [0, 0, 0],
          startPositionMax: [0, 0, 0],
          directionMin: [-1.5, -1.5, -1.5],
          directionMax: [1.5, 1.5, 1.5],
          size: [0.1, 0.4],
          speed: [1, 3],
          colorStart: ["#ccddff", "#ffffff"],
          colorEnd: ["#ffffff", "#aaccff"],
        }}
      />

      {/* Impact effect at target - only show during impact phase */}
      {impactProgress > 0 && impactProgress < 1 && (
        <group position={[
          targetPosition[0] - sourcePosition[0],
          targetPosition[1] - sourcePosition[1],
          targetPosition[2] - sourcePosition[2]
        ]}>
          {/* Impact burst */}
          <group position={[0, 0.5, 0]}>
            <VFXEmitter
              emitter="swordSlash"
              autoStart={true}
              settings={{
                loop: false,
                duration: 0.3,
                nbParticles: 30,
                spawnMode: "burst",
                particlesLifetime: [0.2, 0.3],
                startPositionMin: [0, 0, 0],
                startPositionMax: [0, 0, 0],
                directionMin: [-3, -3, -3],
                directionMax: [3, 3, 3],
                size: [0.1, 0.5],
                speed: [2, 5],
                colorStart: ["#ffaa00", "#ff6600"],
                colorEnd: ["#ff4400", "#ff0000"],
              }}
            />
          </group>

          {/* Impact flash */}
          <mesh>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshBasicMaterial
              color={0xffffff}
              transparent
              opacity={1 - impactProgress}
            />
          </mesh>

          {/* Impact ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
            <ringGeometry args={[0.3, 0.5 + impactProgress, 32]} />
            <meshBasicMaterial
              color={0xffaa00}
              transparent
              opacity={1 - impactProgress}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Point light for impact */}
          <pointLight
            color={0xffaa00}
            intensity={10 * (1 - impactProgress)}
            distance={3}
          />
        </group>
      )}

      {/* Motion blur trail */}
      <pointLight
        color={0xaaccff}
        intensity={2}
        distance={2}
      />
    </group>
  )
}