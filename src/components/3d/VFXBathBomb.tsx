'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { VFXEmitter } from 'wawa-vfx';
import * as THREE from 'three';

interface VFXBathBombProps {
  sourcePosition: [number, number, number];
  allyPositions: [number, number, number][];
  onComplete: () => void;
}

export const VFXBathBomb: React.FC<VFXBathBombProps> = ({
  sourcePosition,
  allyPositions,
  onComplete
}) => {
  const bombRef = useRef<THREE.Mesh>(null);
  const progress = useRef(0);
  const [isFlying, setIsFlying] = useState(true);
  const [hasExploded, setHasExploded] = useState(false);

  // Calculate center position of allies for bomb target
  const centerPosition: [number, number, number] = [
    allyPositions.reduce((sum, pos) => sum + pos[0], 0) / allyPositions.length,
    1.5, // Fly higher
    allyPositions.reduce((sum, pos) => sum + pos[2], 0) / allyPositions.length
  ];

  useFrame((state, delta) => {
    if (!isFlying && hasExploded) return;

    // Update progress
    progress.current = Math.min(1, progress.current + delta * 2.5);

    // Animate bomb flying to center
    if (bombRef.current && isFlying) {
      const t = progress.current;

      // Arc trajectory
      const x = sourcePosition[0] + (centerPosition[0] - sourcePosition[0]) * t;
      const z = sourcePosition[2] + (centerPosition[2] - sourcePosition[2]) * t;
      const arc = Math.sin(t * Math.PI) * 2; // Higher arc
      const y = sourcePosition[1] + (centerPosition[1] - sourcePosition[1]) * t + arc;

      bombRef.current.position.set(x, y, z);

      // Rotate bomb while flying
      bombRef.current.rotation.x += delta * 5;
      bombRef.current.rotation.y += delta * 3;
    }

    // Explode when reaches center
    if (progress.current >= 1 && !hasExploded) {
      setHasExploded(true);
      setIsFlying(false);

      setTimeout(() => {
        onComplete();
      }, 2000);
    }
  });

  return (
    <>
      {/* Bath Bomb */}
      {isFlying && (
        <mesh ref={bombRef} position={sourcePosition}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial
            color="#ff69b4"
            emissive="#ff1493"
            emissiveIntensity={1}
            metalness={0.5}
            roughness={0.3}
          />
          {/* Sparkles trailing */}
          <pointLight color="#ff69b4" intensity={5} distance={3} />
        </mesh>
      )}

      {/* Explosion of colorful bubbles */}
      {hasExploded && (
        <>
          {/* Main bubble burst at center */}
          <VFXEmitter
            emitter="bathBombBurst"
            autoStart={true}
            settings={{
              loop: false,
              duration: 0.3,
              nbParticles: 50,
              spawnMode: "burst",
              particlesLifetime: [1.0, 2.0],
              startPositionMin: centerPosition,
              startPositionMax: centerPosition,
              directionMin: [-3, -1, -3],
              directionMax: [3, 4, 3],
              size: [0.15, 0.4],
              speed: [2, 5],
              colorStart: ["#ff69b4", "#ff1493", "#9370db", "#87ceeb", "#ffd700", "#00ffff"],
              colorEnd: ["#ff69b4", "#9370db", "#87ceeb"],
            }}
          />

          {/* Bubbles floating to each ally */}
          {allyPositions.map((allyPos, index) => (
            <React.Fragment key={`ally-${index}`}>
              {/* Stream of bubbles to ally */}
              <VFXEmitter
                emitter={`bubbleStream-${index}`}
                autoStart={true}
                settings={{
                  loop: false,
                  duration: 0.8,
                  nbParticles: 15,
                  spawnMode: "time",
                  particlesLifetime: [0.8, 1.5],
                  startPositionMin: centerPosition,
                  startPositionMax: centerPosition,
                  directionMin: [
                    (allyPos[0] - centerPosition[0]) * 0.8,
                    (allyPos[1] - centerPosition[1]) * 0.8,
                    (allyPos[2] - centerPosition[2]) * 0.8
                  ],
                  directionMax: [
                    (allyPos[0] - centerPosition[0]) * 1.2,
                    (allyPos[1] - centerPosition[1]) * 1.2 + 0.5,
                    (allyPos[2] - centerPosition[2]) * 1.2
                  ],
                  size: [0.15, 0.35],
                  speed: [2, 4],
                  colorStart: ["#ff69b4", "#9370db", "#87ceeb", "#ffd700"],
                  colorEnd: ["#ff1493", "#9370db", "#00ffff"],
                }}
              />

              {/* Bubble shield effect around ally */}
              <mesh position={allyPos}>
                <sphereGeometry args={[0.8, 16, 16]} />
                <meshBasicMaterial
                  color="#ff69b4"
                  transparent
                  opacity={0.15}
                  side={THREE.DoubleSide}
                />
              </mesh>

              {/* Floating bubbles around ally */}
              <VFXEmitter
                emitter={`allyBubbles-${index}`}
                autoStart={true}
                settings={{
                  loop: false,
                  duration: 1.2,
                  nbParticles: 12,
                  spawnMode: "time",
                  particlesLifetime: [1.5, 2.5],
                  startPositionMin: [allyPos[0] - 0.5, allyPos[1], allyPos[2] - 0.5],
                  startPositionMax: [allyPos[0] + 0.5, allyPos[1] + 0.5, allyPos[2] + 0.5],
                  directionMin: [-0.5, 0.5, -0.5],
                  directionMax: [0.5, 2, 0.5],
                  size: [0.1, 0.25],
                  speed: [0.5, 1.5],
                  colorStart: ["#ff69b4", "#9370db", "#87ceeb", "#ffd700", "#00ffff"],
                  colorEnd: ["#ff1493", "#9370db", "#87ceeb"],
                }}
              />
            </React.Fragment>
          ))}

          {/* Rainbow shimmer effect */}
          <VFXEmitter
            emitter="rainbowShimmer"
            autoStart={true}
            settings={{
              loop: false,
              duration: 0.5,
              nbParticles: 30,
              spawnMode: "burst",
              particlesLifetime: [0.8, 1.5],
              startPositionMin: centerPosition,
              startPositionMax: centerPosition,
              directionMin: [-2, 0, -2],
              directionMax: [2, 3, 2],
              size: [0.05, 0.15],
              speed: [3, 6],
              colorStart: ["#ff0000", "#ff7f00", "#ffff00", "#00ff00", "#0000ff", "#4b0082", "#9400d3"],
              colorEnd: ["#ff69b4", "#9370db", "#87ceeb"],
            }}
          />

          {/* Ambient bubbles floating across battlefield */}
          <VFXEmitter
            emitter="ambientBubbles"
            autoStart={true}
            settings={{
              loop: false,
              duration: 1.5,
              nbParticles: 30,
              spawnMode: "time",
              particlesLifetime: [2.5, 4.0],
              startPositionMin: [-6, 0, -3],
              startPositionMax: [6, 0.5, 3],
              directionMin: [-0.2, 1.8, -0.2],
              directionMax: [0.2, 3.5, 0.2],
              size: [0.25, 0.6],
              speed: [0.8, 1.5],
              colorStart: ["#ff69b4", "#9370db", "#87ceeb", "#ffd700", "#00ffff", "#ff1493"],
              colorEnd: ["#ff69b4", "#9370db", "#87ceeb"],
            }}
          />

          {/* Secondary ambient bubbles - different timing */}
          <VFXEmitter
            emitter="ambientBubbles2"
            autoStart={true}
            settings={{
              loop: false,
              duration: 1.8,
              nbParticles: 25,
              spawnMode: "time",
              particlesLifetime: [2.0, 3.5],
              startPositionMin: [-5, 0.3, -2.5],
              startPositionMax: [5, 1, 2.5],
              directionMin: [-0.3, 1.5, -0.3],
              directionMax: [0.3, 3, 0.3],
              size: [0.2, 0.5],
              speed: [0.7, 1.3],
              colorStart: ["#ffd700", "#ff69b4", "#87ceeb", "#9370db", "#00ffff"],
              colorEnd: ["#ff1493", "#9370db", "#87ceeb"],
            }}
          />
        </>
      )}
    </>
  );
};
