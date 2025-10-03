import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { VFXEmitter } from 'wawa-vfx'

interface VFXWhirlwindSlashProps {
  position: [number, number, number]
  targetPositions?: [number, number, number][]
  onComplete: () => void
}

// Individual sword component (copy of VFXSwordStrike)
function Sword({
  sourcePosition,
  targetPosition,
  delay
}: {
  sourcePosition: [number, number, number]
  targetPosition: [number, number, number]
  delay: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const startTime = useRef(Date.now() + delay)
  const duration = 1.5

  useFrame((state) => {
    if (!groupRef.current) return

    const elapsed = (Date.now() - startTime.current) / 1000
    if (elapsed < 0) {
      // Not started yet due to delay
      groupRef.current.visible = false
      return
    }

    groupRef.current.visible = true
    const progress = Math.min(elapsed / duration, 1)

    let currentPos: [number, number, number]

    if (progress < 0.4) {
      // Moving to target - ease out
      const t = progress / 0.4
      const eased = 1 - Math.pow(1 - t, 3)

      currentPos = [
        THREE.MathUtils.lerp(sourcePosition[0], targetPosition[0], eased),
        THREE.MathUtils.lerp(sourcePosition[1], targetPosition[1] + 0.5, eased),
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
      const eased = Math.pow(t, 2)

      currentPos = [
        THREE.MathUtils.lerp(targetPosition[0], sourcePosition[0], eased),
        THREE.MathUtils.lerp(targetPosition[1], sourcePosition[1], eased),
        THREE.MathUtils.lerp(targetPosition[2], sourcePosition[2], eased)
      ]
    }

    groupRef.current.position.set(currentPos[0], currentPos[1], currentPos[2])
    groupRef.current.rotation.z = elapsed * 12 // Fast spin
  })

  const impactProgress = useMemo(() => {
    const elapsed = (Date.now() - startTime.current) / 1000
    return Math.max(0, Math.min((elapsed - 0.4) / 0.2, 1))
  }, [])

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
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
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
    <group ref={groupRef} position={sourcePosition}>
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

      {/* Sword slash trail particles - commented out due to API mismatch */}
      {/* <VFXEmitter
        position={[0, 0, 0]}
        startSize={0.4}
        endSize={0.1}
        particleCount={40}
        lifetime={0.6}
        velocity={[0, 0, 0]}
        velocityRandomness={1.5}
        color={new THREE.Color(0xccddff)}
        endColor={new THREE.Color(0xffffff)}
        fadeOut={0.8}
        blending={THREE.AdditiveBlending}
      /> */}

      {/* Impact effect at target - only show during impact phase */}
      {impactProgress > 0 && impactProgress < 1 && (
        <group position={[
          targetPosition[0] - sourcePosition[0],
          targetPosition[1] - sourcePosition[1],
          targetPosition[2] - sourcePosition[2]
        ]}>
          {/* Impact burst - commented out due to API mismatch */}
          {/* <VFXEmitter
            position={[0, 0.5, 0]}
            startSize={0.5}
            endSize={0.1}
            particleCount={15}
            lifetime={0.3}
            velocity={[0, 0, 0]}
            velocityRandomness={3}
            color={new THREE.Color(0xffaa00)}
            endColor={new THREE.Color(0xff4400)}
            fadeOut={0.5}
            blending={THREE.AdditiveBlending}
          /> */}

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

export function VFXWhirlwindSlash({ position, targetPositions, onComplete }: VFXWhirlwindSlashProps) {
  const duration = 1.5 // Duration per sword animation

  useEffect(() => {
    if (!targetPositions || targetPositions.length === 0) {
      onComplete()
      return
    }

    // Complete after last sword finishes (duration + last delay)
    const lastDelay = (targetPositions.length - 1) * 0.1
    const totalDuration = (duration + lastDelay) * 1000
    const timer = setTimeout(() => {
      onComplete()
    }, totalDuration)

    return () => clearTimeout(timer)
  }, [onComplete, duration, targetPositions])

  if (!targetPositions || targetPositions.length === 0) {
    return null
  }

  return (
    <group>
      {targetPositions.map((target, i) => (
        <Sword
          key={i}
          sourcePosition={position}
          targetPosition={target}
          delay={i * 100} // 100ms stagger
        />
      ))}
    </group>
  )
}
