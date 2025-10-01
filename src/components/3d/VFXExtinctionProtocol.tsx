'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { VFXEmitter } from 'wawa-vfx';
import * as THREE from 'three';

interface VFXExtinctionProtocolProps {
  sourcePosition: [number, number, number];
  targetPositions: [number, number, number][];
  onComplete: () => void;
}

export const VFXExtinctionProtocol: React.FC<VFXExtinctionProtocolProps> = ({
  sourcePosition,
  targetPositions,
  onComplete
}) => {
  const [completedRockets, setCompletedRockets] = useState(0);
  const totalDuration = useRef(0);

  console.log('[VFX EXTINCTION] Component rendered with:', {
    sourcePosition,
    targetPositions,
    targetCount: targetPositions.length
  });

  useEffect(() => {
    // All rockets launch at once, so total duration is just flight + explosion
    totalDuration.current = 1.8; // Flight time + explosion

    if (completedRockets >= targetPositions.length && targetPositions.length > 0) {
      const timer = setTimeout(onComplete, 500);
      return () => clearTimeout(timer);
    }
  }, [completedRockets, targetPositions.length, onComplete]);

  const handleRocketComplete = () => {
    setCompletedRockets(prev => {
      const newCount = prev + 1;
      console.log(`[VFX EXTINCTION] Rocket completed. ${newCount}/${targetPositions.length} done`);
      return newCount;
    });
  };

  if (targetPositions.length === 0) {
    useEffect(() => {
      onComplete();
    }, [onComplete]);
    return null;
  }

  return (
    <>
      {targetPositions.map((target, index) => (
        <RocketProjectile
          key={`rocket-${index}-${target[0]}-${target[2]}`}
          sourcePosition={sourcePosition}
          targetPosition={target}
          rocketIndex={index}
          onComplete={handleRocketComplete}
        />
      ))}
    </>
  );
};

interface RocketProjectileProps {
  sourcePosition: [number, number, number];
  targetPosition: [number, number, number];
  rocketIndex: number;
  onComplete: () => void;
}

const RocketProjectile: React.FC<RocketProjectileProps> = ({
  sourcePosition,
  targetPosition,
  rocketIndex,
  onComplete
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const emitterRef = useRef<any>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const explosionRef = useRef<THREE.Mesh>(null);
  const progress = useRef(0);
  const explosionProgress = useRef(0);
  const [isFlying, setIsFlying] = useState(true); // Start flying immediately
  const [hasExploded, setHasExploded] = useState(false);

  // Offset starting positions slightly so rockets don't overlap
  const offsetX = rocketIndex === 0 ? -0.2 : 0.2;
  const adjustedSourcePosition: [number, number, number] = [
    sourcePosition[0] + offsetX,
    sourcePosition[1],
    sourcePosition[2]
  ];
  const [trailPosition, setTrailPosition] = useState<[number, number, number]>(adjustedSourcePosition);

  useEffect(() => {
    console.log('[ROCKET] Created rocket', rocketIndex, 'target:', targetPosition);
    // Start emitting immediately
    if (emitterRef.current) {
      emitterRef.current.startEmitting(true);
    }
  }, []);

  useFrame((state, delta) => {
    // Animate explosion effects
    if (hasExploded) {
      explosionProgress.current = Math.min(1, explosionProgress.current + delta * 2);

      // Animate shockwave expansion
      if (shockwaveRef.current) {
        const scale = 1 + explosionProgress.current * 3;
        shockwaveRef.current.scale.set(scale, scale, 1);
        const material = shockwaveRef.current.material as THREE.MeshBasicMaterial;
        material.opacity = Math.max(0, 0.8 * (1 - explosionProgress.current));
      }

      // Animate explosion sphere
      if (explosionRef.current) {
        const scale = 1 + explosionProgress.current * 0.5;
        explosionRef.current.scale.set(scale, scale, scale);
        const material = explosionRef.current.material as THREE.MeshBasicMaterial;
        material.opacity = Math.max(0, 1 - explosionProgress.current);
      }

      return;
    }

    if (!isFlying || !meshRef.current) return;

    // Update progress (slowed down from 1.8 to 1.2 for better visibility)
    progress.current = Math.min(1, progress.current + delta * 1.2);

    // Calculate position with arc
    const t = progress.current;
    const arcHeight = 1.5;

    // Interpolate position from adjusted starting point
    const x = adjustedSourcePosition[0] + (targetPosition[0] - adjustedSourcePosition[0]) * t;
    const z = adjustedSourcePosition[2] + (targetPosition[2] - adjustedSourcePosition[2]) * t;
    const baseY = adjustedSourcePosition[1] + (targetPosition[1] - adjustedSourcePosition[1]) * t;
    const arc = Math.sin(t * Math.PI) * arcHeight;
    const y = baseY + arc;

    // Update mesh position
    meshRef.current.position.set(x, y, z);
    setTrailPosition([x, y, z]);

    // Look at target
    const lookAheadT = Math.min(1, t + 0.1);
    const lookX = adjustedSourcePosition[0] + (targetPosition[0] - adjustedSourcePosition[0]) * lookAheadT;
    const lookZ = adjustedSourcePosition[2] + (targetPosition[2] - adjustedSourcePosition[2]) * lookAheadT;
    const lookY = adjustedSourcePosition[1] + (targetPosition[1] - adjustedSourcePosition[1]) * lookAheadT + Math.sin(lookAheadT * Math.PI) * arcHeight;
    meshRef.current.lookAt(lookX, lookY, lookZ);

    // Check if reached target
    if (progress.current >= 1 && !hasExploded) {
      console.log('[ROCKET] Exploding at:', targetPosition);
      setHasExploded(true);
      setIsFlying(false);
      if (emitterRef.current) {
        emitterRef.current.stopEmitting();
      }
      setTimeout(() => {
        console.log('[ROCKET] Completing');
        onComplete();
      }, 1000); // Increased to 1s for dramatic explosion effect
    }
  });

  return (
    <>
      {/* Rocket Mesh */}
      {isFlying && !hasExploded && (
        <mesh ref={meshRef} position={adjustedSourcePosition}>
          <coneGeometry args={[0.1, 0.4, 8]} />
          <meshStandardMaterial
            color={rocketIndex === 0 ? "#ff4444" : "#ffaa44"}
            emissive={rocketIndex === 0 ? "#ff0000" : "#ff6600"}
            emissiveIntensity={1.5}
            metalness={0.8}
            roughness={0.2}
          />
          <pointLight color={rocketIndex === 0 ? "#ff3300" : "#ff9900"} intensity={3} distance={4} />
        </mesh>
      )}

      {/* Rocket Trail */}
      {isFlying && !hasExploded && (
        <VFXEmitter
          ref={emitterRef}
          emitter="rocketTrail"
          autoStart={false}
          settings={{
            loop: true,
            duration: 0.1,
            nbParticles: 10,
            spawnMode: "time",
            particlesLifetime: [0.2, 0.4],
            startPositionMin: trailPosition,
            startPositionMax: trailPosition,
            directionMin: [-0.2, -1, -0.2],
            directionMax: [0.2, -0.5, 0.2],
            size: [0.1, 0.3],
            speed: [0.5, 2],
            colorStart: ["#ff6600", "#ffaa00"],
            colorEnd: ["#ff0000", "#660000"],
            opacity: [1, 0],
          }}
        />
      )}

      {/* Explosion */}
      {hasExploded && (
        <>
          {/* Explosion flash */}
          <mesh ref={explosionRef} position={targetPosition}>
            <sphereGeometry args={[2, 16, 16]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.9}
              side={THREE.DoubleSide}
            />
            <pointLight
              color="#ffaa00"
              intensity={40}
              distance={15}
            />
          </mesh>

          {/* Shockwave ring */}
          <mesh ref={shockwaveRef} position={targetPosition} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.5, 2.5, 32]} />
            <meshBasicMaterial
              color="#ff8800"
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Main fireball particles */}
          <VFXEmitter
            emitter="fireball"
            autoStart={true}
            settings={{
              loop: false,
              duration: 0.2,
              nbParticles: 20,
              spawnMode: "burst",
              particlesLifetime: [0.5, 1.0],
              startPositionMin: targetPosition,
              startPositionMax: targetPosition,
              directionMin: [-3, -1, -3],
              directionMax: [3, 4, 3],
              size: [0.5, 1.5],
              speed: [4, 10],
              colorStart: ["#ffffff", "#ffff00", "#ff8800"],
              colorEnd: ["#ff4400", "#ff0000", "#880000"],
              opacity: [1, 0],
            }}
          />

          {/* Smoke particles */}
          <VFXEmitter
            emitter="smoke"
            autoStart={true}
            settings={{
              loop: false,
              duration: 0.3,
              nbParticles: 15,
              spawnMode: "burst",
              particlesLifetime: [1.0, 2.0],
              startPositionMin: targetPosition,
              startPositionMax: targetPosition,
              directionMin: [-2, 0, -2],
              directionMax: [2, 3, 2],
              size: [0.8, 2.0],
              speed: [1, 3],
              colorStart: ["#666666", "#444444"],
              colorEnd: ["#222222", "#000000"],
              opacity: [0.8, 0],
            }}
          />

          {/* Sparks/debris */}
          <VFXEmitter
            emitter="sparks"
            autoStart={true}
            settings={{
              loop: false,
              duration: 0.1,
              nbParticles: 15,
              spawnMode: "burst",
              particlesLifetime: [0.3, 0.8],
              startPositionMin: targetPosition,
              startPositionMax: targetPosition,
              directionMin: [-4, -2, -4],
              directionMax: [4, 6, 4],
              size: [0.05, 0.15],
              speed: [8, 15],
              colorStart: ["#ffffff", "#ffff88"],
              colorEnd: ["#ff6600", "#ff0000"],
              opacity: [1, 0],
            }}
          />

          {/* Ground scorch mark (optional) */}
          <mesh position={[targetPosition[0], 0.01, targetPosition[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.5, 32]} />
            <meshBasicMaterial
              color="#221100"
              transparent
              opacity={0.7}
            />
          </mesh>
        </>
      )}
    </>
  );
};