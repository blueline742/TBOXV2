import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface VFXClearReviveProps {
  targetPosition: [number, number, number]
  onComplete?: () => void
}

// Defibrillator revival effect with electric shocks
export function VFXClearRevive({ targetPosition, onComplete }: VFXClearReviveProps) {
  const groupRef = useRef<THREE.Group>(null)
  const paddlesRef = useRef<THREE.Group>(null)
  const [progress, setProgress] = useState(0)
  const [shockPhase, setShockPhase] = useState(0)
  const startTime = useRef(Date.now())
  const duration = 3.0

  useEffect(() => {
    if (onComplete && progress >= 1) {
      setTimeout(onComplete, 300)
    }
  }, [progress, onComplete])

  useFrame((state) => {
    const elapsed = (Date.now() - startTime.current) / 1000
    const t = Math.min(elapsed / duration, 1)
    setProgress(t)

    // Three shock phases
    if (t < 0.3) {
      setShockPhase(1)
    } else if (t < 0.6) {
      setShockPhase(2)
    } else if (t < 0.9) {
      setShockPhase(3)
    } else {
      setShockPhase(0)
    }

    // Animate paddles
    if (paddlesRef.current) {
      if (shockPhase > 0) {
        // During shock, paddles come down
        paddlesRef.current.position.y = 0.5 - (shockPhase === 2 ? 0.3 : 0)
        paddlesRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 30) * 0.1 // Vibration
      } else {
        // Paddles hovering
        paddlesRef.current.position.y = 1.5 + Math.sin(state.clock.elapsedTime * 2) * 0.1
      }
    }
  })

  return (
    <group ref={groupRef} position={targetPosition}>
      {/* Defibrillator paddles */}
      <group ref={paddlesRef}>
        {/* Left paddle */}
        <group position={[-0.3, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.15, 0.15, 0.05, 16]} />
            <meshStandardMaterial
              color="#ff0000"
              metalness={0.7}
              roughness={0.3}
              emissive="#ff0000"
              emissiveIntensity={shockPhase > 0 ? 0.5 : 0.1}
            />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
        </group>

        {/* Right paddle */}
        <group position={[0.3, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.15, 0.15, 0.05, 16]} />
            <meshStandardMaterial
              color="#0000ff"
              metalness={0.7}
              roughness={0.3}
              emissive="#0000ff"
              emissiveIntensity={shockPhase > 0 ? 0.5 : 0.1}
            />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
        </group>

        {/* Electric arc between paddles during shock */}
        {shockPhase > 0 && (
          <>
            {/* Lightning bolts */}
            {Array.from({ length: 5 }, (_, i) => {
              const offset = (Math.random() - 0.5) * 0.2
              return (
                <mesh key={i} position={[0, offset, offset]}>
                  <boxGeometry args={[0.6, 0.02, 0.02]} />
                  <meshBasicMaterial
                    color="#00ffff"
                    transparent
                    opacity={Math.random() * 0.8 + 0.2}
                  />
                </mesh>
              )
            })}
          </>
        )}
      </group>

      {/* Electric shock waves */}
      {shockPhase > 0 && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.1, 0.5 + shockPhase * 0.3, 32]} />
            <meshBasicMaterial
              color="#00ffff"
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Electric particles */}
          {Array.from({ length: 20 }, (_, i) => {
            const angle = (i / 20) * Math.PI * 2 + Date.now() * 0.01
            const radius = 0.3 + Math.random() * 0.5
            return (
              <mesh
                key={i}
                position={[
                  Math.cos(angle) * radius,
                  Math.random() * 0.5,
                  Math.sin(angle) * radius
                ]}
              >
                <sphereGeometry args={[0.03, 6, 6]} />
                <meshBasicMaterial
                  color="#ffff00"
                  transparent
                  opacity={Math.random()}
                />
              </mesh>
            )
          })}
        </>
      )}

      {/* Revival heart beat effect */}
      {progress > 0.7 && (
        <>
          {/* Heart symbol pulsing */}
          <group
            position={[0, 1, 0]}
            scale={[
              1 + Math.sin((progress - 0.7) * 30) * 0.2,
              1 + Math.sin((progress - 0.7) * 30) * 0.2,
              1 + Math.sin((progress - 0.7) * 30) * 0.2
            ]}
          >
            <mesh>
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshBasicMaterial color="#ff0066" transparent opacity={0.8} />
            </mesh>
          </group>

          {/* Life energy rising */}
          <mesh position={[0, (progress - 0.7) * 5, 0]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial
              color="#00ff00"
              transparent
              opacity={(1 - (progress - 0.7) * 3) * 0.6}
            />
          </mesh>
        </>
      )}

      {/* EKG line effect */}
      <group position={[0, 0.5, 0]}>
        <mesh>
          <planeGeometry args={[2, 0.1]} />
          <meshBasicMaterial
            color="#00ff00"
            transparent
            opacity={progress * 0.6}
          />
        </mesh>
      </group>

      {/* Ground revival circle */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.2, 32]} />
        <meshBasicMaterial
          color="#00ff00"
          transparent
          opacity={progress * 0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Flash lights for shock effect */}
      {shockPhase > 0 && (
        <>
          <pointLight color="#00ffff" intensity={10} distance={5} />
          <pointLight color="#ffff00" intensity={8} distance={4} position={[0, 1, 0]} />
        </>
      )}
    </group>
  )
}