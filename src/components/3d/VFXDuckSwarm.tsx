'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { VFXEmitter } from 'wawa-vfx';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface VFXDuckSwarmProps {
  sourcePosition: [number, number, number];
  targetPositions: [number, number, number][];
  onComplete: () => void;
}

interface DuckProjectileProps {
  sourcePosition: [number, number, number];
  targetPosition: [number, number, number];
  delay: number;
  duckIndex: number;
  onComplete: () => void;
}

const DuckProjectile: React.FC<DuckProjectileProps> = ({
  sourcePosition,
  targetPosition,
  delay,
  duckIndex,
  onComplete
}) => {
  const duckRef = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const [isFlying, setIsFlying] = useState(false);
  const [hasExploded, setHasExploded] = useState(false);

  // Load duck model
  const { scene } = useGLTF('/models/toy_duck.glb');

  // Start flying after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFlying(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useFrame((state, delta) => {
    if (!isFlying || hasExploded) return;

    progress.current = Math.min(1, progress.current + delta * 3);

    if (duckRef.current) {
      const t = progress.current;

      // Wave motion for swarm effect
      const waveOffset = Math.sin(state.clock.elapsedTime * 5 + duckIndex * 0.8) * 0.3;

      // Arc trajectory
      const x = sourcePosition[0] + (targetPosition[0] - sourcePosition[0]) * t + waveOffset;
      const z = sourcePosition[2] + (targetPosition[2] - sourcePosition[2]) * t;
      const arc = Math.sin(t * Math.PI) * 1.5;
      const y = sourcePosition[1] + (targetPosition[1] - sourcePosition[1]) * t + arc;

      duckRef.current.position.set(x, y, z);

      // Bobbing rotation
      duckRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 8 + duckIndex) * 0.3;
      duckRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 6 + duckIndex) * 0.2;
    }

    if (progress.current >= 1 && !hasExploded) {
      setHasExploded(true);
      setIsFlying(false);
      setTimeout(() => onComplete(), 300);
    }
  });

  if (!isFlying && !hasExploded) return null;

  return (
    <>
      {/* Duck projectile */}
      {isFlying && (
        <group ref={duckRef} position={sourcePosition}>
          <primitive object={scene.clone()} scale={0.015} />
          {/* Duck glow */}
          <pointLight color="#FFD700" intensity={3} distance={2} />
        </group>
      )}

      {/* Feather trail */}
      {isFlying && (
        <VFXEmitter
          emitter={`duckTrail-${duckIndex}`}
          autoStart={true}
          settings={{
            loop: true,
            duration: 0.1,
            nbParticles: 3,
            spawnMode: "time",
            particlesLifetime: [0.5, 0.8],
            startPositionMin: duckRef.current?.position.toArray() || sourcePosition,
            startPositionMax: duckRef.current?.position.toArray() || sourcePosition,
            directionMin: [-0.5, -0.5, -0.5],
            directionMax: [0.5, 0.5, 0.5],
            size: [0.08, 0.15],
            speed: [0.3, 0.8],
            colorStart: ["#FFFFFF", "#FFD700", "#FFA500"],
            colorEnd: ["#FFD700", "#FF8C00"],
          }}
        />
      )}

      {/* Feather explosion on impact */}
      {hasExploded && (
        <VFXEmitter
          emitter={`duckImpact-${duckIndex}`}
          autoStart={true}
          settings={{
            loop: false,
            duration: 0.15,
            nbParticles: 12,
            spawnMode: "burst",
            particlesLifetime: [0.6, 1.0],
            startPositionMin: targetPosition,
            startPositionMax: targetPosition,
            directionMin: [-2, -0.5, -2],
            directionMax: [2, 3, 2],
            size: [0.1, 0.25],
            speed: [2, 4],
            colorStart: ["#FFFFFF", "#FFD700", "#FFA500"],
            colorEnd: ["#FFD700", "#FF8C00"],
          }}
        />
      )}
    </>
  );
};

export const VFXDuckSwarm: React.FC<VFXDuckSwarmProps> = ({
  sourcePosition,
  targetPositions,
  onComplete
}) => {
  const [completedDucks, setCompletedDucks] = useState(0);

  const handleDuckComplete = () => {
    setCompletedDucks(prev => {
      const newCount = prev + 1;
      if (newCount >= 6) {
        onComplete();
      }
      return newCount;
    });
  };

  // Create 6 ducks targeting all enemies (distributed)
  const duckTargets = [];
  for (let i = 0; i < 6; i++) {
    const targetIndex = i % targetPositions.length;
    duckTargets.push({
      target: targetPositions[targetIndex],
      delay: i * 80, // Stagger launches
      index: i
    });
  }

  return (
    <>
      {duckTargets.map((duck) => (
        <DuckProjectile
          key={`duck-${duck.index}`}
          sourcePosition={sourcePosition}
          targetPosition={duck.target}
          delay={duck.delay}
          duckIndex={duck.index}
          onComplete={handleDuckComplete}
        />
      ))}

      {/* Quack sound wave effect at source */}
      <VFXEmitter
        emitter="quackWave"
        autoStart={true}
        settings={{
          loop: false,
          duration: 0.3,
          nbParticles: 8,
          spawnMode: "burst",
          particlesLifetime: [0.4, 0.7],
          startPositionMin: sourcePosition,
          startPositionMax: sourcePosition,
          directionMin: [-1, 0, -1],
          directionMax: [1, 0.5, 1],
          size: [0.15, 0.3],
          speed: [2, 3],
          colorStart: ["#FFD700", "#FFA500"],
          colorEnd: ["#FF8C00"],
        }}
      />
    </>
  );
};

// Preload duck model
useGLTF.preload('/models/toy_duck.glb');
