import { useRef, useEffect, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface VFXPuppetMasterProps {
  enemyPosition: [number, number, number]  // Enemy being drained
  allyPosition: [number, number, number]   // Ally being healed
  onComplete?: () => void
}

// Single green energy beam from enemy to ally
export function VFXPuppetMaster({
  enemyPosition,
  allyPosition,
  onComplete
}: VFXPuppetMasterProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const [progress, setProgress] = useState(0)
  const startTime = useRef(Date.now())
  const duration = 1.5

  console.log('[PUPPET MASTER VFX] Enemy:', enemyPosition, 'Ally:', allyPosition)

  // Create curved path between enemy and ally
  const curve = useMemo(() => {
    const startVec = new THREE.Vector3(...enemyPosition)
    const endVec = new THREE.Vector3(...allyPosition)
    const midPoint = new THREE.Vector3().lerpVectors(startVec, endVec, 0.5)
    midPoint.y += 1.5 // Arc height
    return new THREE.QuadraticBezierCurve3(startVec, midPoint, endVec)
  }, [enemyPosition, allyPosition])

  // Create tube geometry
  const geometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 50, 0.1, 8, false)
  }, [curve])

  // Custom shader material for green energy effect
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        progress: { value: 0 },
        color: { value: new THREE.Color('#00ff44') },
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
          float wave = sin(uv.x * 10.0 - time * 5.0) * 0.06;
          pos.y += wave;
          pos.x += cos(uv.x * 8.0 - time * 4.0) * 0.04;

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

          vec3 finalColor = color + vec3(0.3) * flow; // Brighter core
          float finalAlpha = opacity * glow * endFade * (0.8 + flow * 0.2);

          gl_FragColor = vec4(finalColor, finalAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  }, [])

  useEffect(() => {
    if (onComplete && progress >= 1) {
      setTimeout(onComplete, 300)
    }
  }, [progress, onComplete])

  useFrame((state) => {
    if (materialRef.current) {
      const elapsed = (Date.now() - startTime.current) / 1000
      const t = Math.min(elapsed / duration, 1)
      setProgress(t)
      materialRef.current.uniforms.time.value = state.clock.elapsedTime
      materialRef.current.uniforms.progress.value = t

      // Pulse effect
      const pulse = Math.sin(state.clock.elapsedTime * 8) * 0.2 + 0.8
      materialRef.current.uniforms.opacity.value = pulse
    }
  })

  return (
    <group>
      {/* Main green energy beam from enemy to ally */}
      <mesh ref={meshRef} geometry={geometry} material={material}>
        <primitive attach="material" object={material} ref={materialRef} />
      </mesh>

      {/* Glow sphere at enemy (energy source) */}
      <mesh position={enemyPosition}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color="#00ff44" transparent opacity={0.8} />
      </mesh>

      {/* Glow sphere at ally (energy destination) */}
      <mesh position={allyPosition}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color="#00ff44" transparent opacity={0.6} />
      </mesh>

      {/* Green heal ring at ally */}
      <mesh position={[allyPosition[0], 0.1, allyPosition[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.5, 32]} />
        <meshBasicMaterial
          color="#00ff44"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Point lights for glow effect */}
      <pointLight position={enemyPosition} color="#00ff44" intensity={3} distance={3} />
      <pointLight position={allyPosition} color="#00ff44" intensity={4} distance={3} />
    </group>
  )
}
