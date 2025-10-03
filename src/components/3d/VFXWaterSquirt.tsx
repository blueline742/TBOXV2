'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { VFXEmitter } from 'wawa-vfx';
import * as THREE from 'three';

interface VFXWaterSquirtProps {
  sourcePosition: [number, number, number];
  targetPosition: [number, number, number];
  onComplete: () => void;
}

export const VFXWaterSquirt: React.FC<VFXWaterSquirtProps> = ({
  sourcePosition,
  targetPosition,
  onComplete
}) => {
  const streamRef = useRef<THREE.Mesh>(null);
  const splashRef = useRef<any>(null);
  const streamEmitterRef = useRef<any>(null);
  const progress = useRef(0);
  const [isSquirting, setIsSquirting] = useState(true);
  const [hasSplashed, setHasSplashed] = useState(false);
  const [streamScale, setStreamScale] = useState(0);

  // Calculate direction and distance
  const direction = new THREE.Vector3(
    targetPosition[0] - sourcePosition[0],
    targetPosition[1] - sourcePosition[1],
    targetPosition[2] - sourcePosition[2]
  );
  const distance = direction.length();
  direction.normalize();

  // Start emitting immediately
  useEffect(() => {
    if (streamEmitterRef.current) {
      streamEmitterRef.current.startEmitting(true);
    }
  }, []);

  useFrame((state, delta) => {
    if (!isSquirting && hasSplashed) return;

    // Update progress (slower for longer stream effect)
    progress.current = Math.min(1, progress.current + delta * 2.5);

    // Animate water stream growth
    if (streamRef.current && isSquirting) {
      const t = progress.current;

      // Gradually scale stream to full length
      const currentScale = t * distance * 1.2;
      setStreamScale(currentScale);

      // Position stream starting from source
      const midX = sourcePosition[0] + (direction.x * currentScale * 0.5);
      const midY = sourcePosition[1] + (direction.y * currentScale * 0.5) + 0.3; // Slight upward arc
      const midZ = sourcePosition[2] + (direction.z * currentScale * 0.5);

      streamRef.current.position.set(midX, midY, midZ);
      streamRef.current.scale.set(currentScale, 0.15, 0.15);

      // Rotate to point toward target
      streamRef.current.lookAt(
        sourcePosition[0] + direction.x * distance,
        sourcePosition[1] + direction.y * distance,
        sourcePosition[2] + direction.z * distance
      );
      streamRef.current.rotateX(Math.PI / 2);
    }

    // Check if reached target
    if (progress.current >= 1 && !hasSplashed) {
      setHasSplashed(true);
      setIsSquirting(false);

      // Stop stream emitter
      if (streamEmitterRef.current) {
        streamEmitterRef.current.stopEmitting();
      }

      // Start splash effect
      if (splashRef.current) {
        splashRef.current.startEmitting(true);
      }

      // Complete after splash
      setTimeout(() => {
        onComplete();
      }, 1000);
    }
  });

  return (
    <>
      {/* Water Stream */}
      {isSquirting && (
        <>
          {/* Main stream cylinder */}
          <mesh ref={streamRef} position={sourcePosition}>
            <cylinderGeometry args={[0.12, 0.18, 1, 12]} />
            <meshStandardMaterial
              color="#66ccff"
              emissive="#3399ff"
              emissiveIntensity={0.4}
              transparent
              opacity={0.65}
              roughness={0}
              metalness={0.8}
            />
          </mesh>

          {/* Continuous water droplet stream */}
          <VFXEmitter
            ref={streamEmitterRef}
            emitter="waterStream"
            autoStart={false}
            settings={{
              loop: true,
              duration: 0.05,
              nbParticles: 20,
              spawnMode: "time",
              particlesLifetime: [0.3, 0.6],
              startPositionMin: sourcePosition,
              startPositionMax: [sourcePosition[0] + 0.1, sourcePosition[1], sourcePosition[2] + 0.1],
              directionMin: [direction.x * 3, direction.y * 3, direction.z * 3],
              directionMax: [direction.x * 4, direction.y * 4 + 0.5, direction.z * 4],
              size: [0.08, 0.18],
              speed: [distance * 4, distance * 6],
              colorStart: ["#99ddff", "#66ccff", "#80dfff"],
              colorEnd: ["#4da6ff", "#3399ff", "#1a80ff"],
            }}
          />

          {/* Water mist particles */}
          <VFXEmitter
            emitter="waterMist"
            autoStart={true}
            settings={{
              loop: true,
              duration: 0.1,
              nbParticles: 15,
              spawnMode: "time",
              particlesLifetime: [0.4, 0.7],
              startPositionMin: sourcePosition,
              startPositionMax: sourcePosition,
              directionMin: [direction.x * 2 - 0.3, direction.y * 2 - 0.2, direction.z * 2 - 0.3],
              directionMax: [direction.x * 2 + 0.3, direction.y * 2 + 0.3, direction.z * 2 + 0.3],
              size: [0.15, 0.35],
              speed: [distance * 3, distance * 5],
              colorStart: ["#b3e6ff", "#80dfff"],
              colorEnd: ["#66ccff", "#4da6ff"],
            }}
          />
        </>
      )}

      {/* Water Splash on Impact */}
      {hasSplashed && (
        <>
          {/* Main splash burst */}
          <VFXEmitter
            ref={splashRef}
            emitter="waterSplash"
            autoStart={false}
            settings={{
              loop: false,
              duration: 0.2,
              nbParticles: 40,
              spawnMode: "burst",
              particlesLifetime: [0.5, 1.0],
              startPositionMin: targetPosition,
              startPositionMax: targetPosition,
              directionMin: [-2, -0.5, -2],
              directionMax: [2, 4, 2],
              size: [0.12, 0.35],
              speed: [3, 7],
              colorStart: ["#99ddff", "#66ccff", "#80dfff"],
              colorEnd: ["#4da6ff", "#3399ff", "#0066cc"],
            }}
          />

          {/* Water spray mist */}
          <VFXEmitter
            emitter="waterSpray"
            autoStart={true}
            settings={{
              loop: false,
              duration: 0.4,
              nbParticles: 25,
              spawnMode: "burst",
              particlesLifetime: [0.6, 1.2],
              startPositionMin: targetPosition,
              startPositionMax: targetPosition,
              directionMin: [-1, 0, -1],
              directionMax: [1, 2, 1],
              size: [0.2, 0.5],
              speed: [1, 3],
              colorStart: ["#b3e6ff", "#99ddff"],
              colorEnd: ["#66ccff", "#4da6ff"],
            }}
          />

          {/* Drip particles (for wet effect) */}
          <VFXEmitter
            emitter="waterDrips"
            autoStart={true}
            settings={{
              loop: false,
              duration: 0.6,
              nbParticles: 15,
              spawnMode: "time",
              particlesLifetime: [0.7, 1.5],
              startPositionMin: [targetPosition[0] - 0.4, targetPosition[1] + 0.8, targetPosition[2] - 0.4],
              startPositionMax: [targetPosition[0] + 0.4, targetPosition[1] + 0.8, targetPosition[2] + 0.4],
              directionMin: [-0.2, -1.5, -0.2],
              directionMax: [0.2, -0.8, 0.2],
              size: [0.06, 0.14],
              speed: [0.8, 2],
              colorStart: ["#99ddff", "#66ccff"],
              colorEnd: ["#4da6ff", "#1a80ff"],
            }}
          />

          {/* Wet puddle effect - at ground level below card */}
          <mesh position={[targetPosition[0], 0.01, targetPosition[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.2, 32]} />
            <meshStandardMaterial
              color="#3399ff"
              transparent
              opacity={0.55}
              roughness={0}
              metalness={0.9}
              emissive="#1a80ff"
              emissiveIntensity={0.3}
            />
          </mesh>

          {/* Inner water reflection */}
          <mesh position={[targetPosition[0], 0.02, targetPosition[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.6, 32]} />
            <meshBasicMaterial
              color="#99ddff"
              transparent
              opacity={0.65}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Water ripple ring - animated effect */}
          <mesh position={[targetPosition[0], 0.03, targetPosition[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.5, 1.5, 32]} />
            <meshBasicMaterial
              color="#80dfff"
              transparent
              opacity={0.55}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Outer ripple */}
          <mesh position={[targetPosition[0], 0.04, targetPosition[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.2, 2.0, 32]} />
            <meshBasicMaterial
              color="#66ccff"
              transparent
              opacity={0.35}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}
    </>
  );
};