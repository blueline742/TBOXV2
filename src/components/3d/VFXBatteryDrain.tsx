import { useRef, useEffect, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { VFXEmitter } from 'wawa-vfx'

interface VFXBatteryDrainProps {
  sourcePosition: [number, number, number]  // Arch Wizard position
  enemyPositions: [number, number, number][]  // All enemy positions
  allyPositions: [number, number, number][]  // All ally positions
  onComplete?: () => void
}

// Component for animated energy beam
function EnergyBeam({
  start,
  end,
  color,
  delay = 0,
  duration = 1,
  onComplete
}: {
  start: [number, number, number]
  end: [number, number, number]
  color: string
  delay?: number
  duration?: number
  onComplete?: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const [progress, setProgress] = useState(0)
  const startTime = useRef(Date.now() + delay * 1000)

  // Create curved path between points
  const curve = useMemo(() => {
    const startVec = new THREE.Vector3(...start)
    const endVec = new THREE.Vector3(...end)
    const midPoint = new THREE.Vector3().lerpVectors(startVec, endVec, 0.5)
    midPoint.y += 1.5 // Arc height

    return new THREE.QuadraticBezierCurve3(startVec, midPoint, endVec)
  }, [start, end])

  // Create tube geometry
  const geometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 50, 0.08, 8, false)
  }, [curve])

  // Custom shader material for energy effect
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        progress: { value: 0 },
        color: { value: new THREE.Color(color) },
        opacity: { value: 1.0 }
      },
      vertexShader: `
        uniform float time;
        uniform float progress;
        varying vec2 vUv;
        varying float vProgress;

        void main() {
          vUv = uv;
          vProgress = uv.x;

          vec3 pos = position;

          // Wave effect along the beam
          float wave = sin(uv.x * 10.0 - time * 5.0) * 0.05;
          pos.y += wave;
          pos.x += cos(uv.x * 8.0 - time * 4.0) * 0.03;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float progress;
        uniform vec3 color;
        uniform float opacity;
        varying vec2 vUv;
        varying float vProgress;

        void main() {
          // Only show the part that has animated
          if (vProgress > progress) {
            discard;
          }

          // Energy flow effect
          float flow = sin(vProgress * 20.0 - time * 10.0) * 0.3 + 0.7;

          // Glow at edges
          float glow = 1.0 - abs(vUv.y - 0.5) * 2.0;
          glow = pow(glow, 2.0);

          // Fade at ends
          float endFade = smoothstep(0.0, 0.1, vProgress) * smoothstep(1.0, 0.9, vProgress);

          vec3 finalColor = color + vec3(0.5) * flow; // Brighter core
          float finalAlpha = opacity * glow * endFade * (0.8 + flow * 0.2);

          gl_FragColor = vec4(finalColor, finalAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  }, [color])

  useEffect(() => {
    if (onComplete && progress >= 1) {
      setTimeout(onComplete, 200)
    }
  }, [progress, onComplete])

  useFrame((state) => {
    if (materialRef.current) {
      const elapsed = (Date.now() - startTime.current) / 1000

      if (elapsed >= 0) {
        const t = Math.min(elapsed / duration, 1)
        setProgress(t)
        materialRef.current.uniforms.time.value = state.clock.elapsedTime
        materialRef.current.uniforms.progress.value = t

        // Pulse effect
        const pulse = Math.sin(state.clock.elapsedTime * 8) * 0.2 + 0.8
        materialRef.current.uniforms.opacity.value = pulse
      }
    }
  })

  return (
    <>
      <mesh ref={meshRef} geometry={geometry} material={material}>
        <primitive attach="material" object={material} ref={materialRef} />
      </mesh>

      {/* Glow sphere at start */}
      <mesh position={start}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>

      {/* Point light for glow effect */}
      <pointLight position={start} color={color} intensity={2} distance={3} />
    </>
  )
}

export function VFXBatteryDrain({
  sourcePosition,
  enemyPositions,
  allyPositions,
  onComplete
}: VFXBatteryDrainProps) {
  const [phase, setPhase] = useState<'draining' | 'redistributing' | 'complete'>('draining')
  const groupRef = useRef<THREE.Group>(null)

  // Debug logging
  console.log('[VFX BATTERY DRAIN] Source:', sourcePosition)
  console.log('[VFX BATTERY DRAIN] Enemies:', enemyPositions)
  console.log('[VFX BATTERY DRAIN] Allies:', allyPositions)

  useEffect(() => {
    // Phase transitions
    const drainDuration = 1500
    const redistributeDuration = 1500

    const drainTimer = setTimeout(() => {
      setPhase('redistributing')
    }, drainDuration)

    const completeTimer = setTimeout(() => {
      setPhase('complete')
      onComplete?.()
    }, drainDuration + redistributeDuration)

    return () => {
      clearTimeout(drainTimer)
      clearTimeout(completeTimer)
    }
  }, [onComplete])

  return (
    <group ref={groupRef}>
      {/* Central nexus at Arch Wizard - pulses between phases */}
      <mesh position={sourcePosition}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial
          color={phase === 'draining' ? 0xff0044 : 0x00ff44}
          emissive={phase === 'draining' ? 0xff0044 : 0x00ff44}
          emissiveIntensity={phase === 'draining' ? 2 : 3}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Rotating ring around caster */}
      <mesh position={sourcePosition}>
        <torusGeometry args={[0.8, 0.05, 8, 32]} />
        <meshStandardMaterial
          color={phase === 'draining' ? 0xff4444 : 0x44ff44}
          emissive={phase === 'draining' ? 0xff0044 : 0x00ff44}
          emissiveIntensity={2}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Phase 1: Red energy draining from enemies */}
      {phase === 'draining' && enemyPositions && enemyPositions.length > 0 && enemyPositions.map((enemyPos, index) => {
        // Ensure positions have proper height
        const enemyPosFixed: [number, number, number] = [
          enemyPos[0],
          enemyPos[1] || 0.5,
          enemyPos[2]
        ]
        const sourcePosFixed: [number, number, number] = [
          sourcePosition[0],
          sourcePosition[1] || 0.5,
          sourcePosition[2]
        ]

        return (
        <group key={`drain-${index}`}>
          {/* Red energy beam from enemy to wizard */}
          <EnergyBeam
            start={enemyPosFixed}
            end={sourcePosFixed}
            color="#ff0044"
            delay={index * 0.1}
            duration={1.2}
          />

          {/* Drain particles at enemy */}
          <VFXEmitter
            position={enemyPos}
            startSize={0.2}
            endSize={0.01}
            particleCount={30}
            lifetime={1}
            velocity={[
              (sourcePosition[0] - enemyPos[0]) * 0.5,
              (sourcePosition[1] - enemyPos[1]) * 0.5 + 1,
              (sourcePosition[2] - enemyPos[2]) * 0.5
            ]}
            velocityRandomness={0.3}
            color={new THREE.Color(0xff0044)}
            endColor={new THREE.Color(0xff8888)}
            fadeOut={0.5}
          />

          {/* Red damage ring at enemy */}
          <mesh position={[enemyPos[0], 0.1, enemyPos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.3, 0.5, 32]} />
            <meshBasicMaterial
              color={0xff0044}
              transparent
              opacity={0.6 - index * 0.05}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )})}

      {/* Phase 2: Green energy redistributing to allies */}
      {phase === 'redistributing' && allyPositions && allyPositions.length > 0 && allyPositions.map((allyPos, index) => {
        // Ensure positions have proper height
        const allyPosFixed: [number, number, number] = [
          allyPos[0],
          allyPos[1] || 0.5,
          allyPos[2]
        ]
        const sourcePosFixed: [number, number, number] = [
          sourcePosition[0],
          sourcePosition[1] || 0.5,
          sourcePosition[2]
        ]

        return (
        <group key={`heal-${index}`}>
          {/* Green energy beam from wizard to ally */}
          <EnergyBeam
            start={sourcePosFixed}
            end={allyPosFixed}
            color="#00ff44"
            delay={index * 0.1}
            duration={1.2}
          />

          {/* Healing particles at ally */}
          <VFXEmitter
            position={allyPos}
            startSize={0.15}
            endSize={0.01}
            particleCount={25}
            lifetime={1}
            velocity={[0, 2, 0]}
            velocityRandomness={1}
            color={new THREE.Color(0x00ff44)}
            endColor={new THREE.Color(0xffffff)}
            fadeOut={0.3}
          />

          {/* Green heal glow at ally */}
          <mesh position={allyPos}>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshBasicMaterial
              color={0x00ff44}
              transparent
              opacity={0.3}
            />
          </mesh>

          {/* Heal ring on ground */}
          <mesh position={[allyPos[0], 0.1, allyPos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.2, 0.4, 32]} />
            <meshBasicMaterial
              color={0x00ff44}
              transparent
              opacity={0.5}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )})}

      {/* Ambient lighting */}
      <pointLight
        position={sourcePosition}
        color={phase === 'draining' ? 0xff0044 : 0x00ff44}
        intensity={10}
        distance={15}
      />
    </group>
  )
}