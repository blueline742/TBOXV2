'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { VFXEmitter } from 'wawa-vfx';
import * as THREE from 'three';

interface VFXFireballProps {
  position: [number, number, number];
  target: [number, number, number];
  onComplete: () => void;
  vfxRef?: React.RefObject<any>;
}

export const VFXFireball: React.FC<VFXFireballProps> = ({
  position,
  target,
  onComplete
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const emitterRef = useRef<any>(null);
  const startPos = useRef(new THREE.Vector3(...position));
  const endPos = useRef(new THREE.Vector3(...target));
  const progress = useRef(0);
  const [currentPosition, setCurrentPosition] = useState<[number, number, number]>(position);

  useEffect(() => {
    progress.current = 0;
    startPos.current.set(...position);
    endPos.current.set(...target);

    // Start emitting when component mounts
    if (emitterRef.current) {
      emitterRef.current.startEmitting(true);
    }
  }, [position, target]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Update progress
    progress.current = Math.min(1, progress.current + delta * 2);

    // Update position
    meshRef.current.position.lerpVectors(
      startPos.current,
      endPos.current,
      progress.current
    );

    // Update emitter position
    setCurrentPosition([
      meshRef.current.position.x,
      meshRef.current.position.y,
      meshRef.current.position.z
    ]);

    // Look at target
    meshRef.current.lookAt(endPos.current);

    // Handle completion
    if (progress.current >= 1) {
      if (emitterRef.current) {
        emitterRef.current.stopEmitting();
      }
      onComplete();
    }
  });

  return (
    <>
      {/* Fireball mesh */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color="#ff6600"
          emissive="#ff3300"
          emissiveIntensity={2}
          toneMapped={false}
        />
        <pointLight color="#ff6600" intensity={2} distance={5} />
      </mesh>

      {/* Particle emitter for trail */}
      <VFXEmitter
        ref={emitterRef}
        emitter="fireballTrail"
        autoStart={false}
        settings={{
          loop: true,
          duration: 0.1,
          nbParticles: 10,
          spawnMode: "time",
          particlesLifetime: [0.3, 0.6],
          startPositionMin: currentPosition,
          startPositionMax: currentPosition,
          directionMin: [-0.5, -0.5, -0.5],
          directionMax: [0.5, 0.5, 0.5],
          size: [0.1, 0.3],
          speed: [0.5, 2],
          colorStart: ["#ff6600", "#ffaa00"],
          colorEnd: ["#ff0000", "#aa0000"],
        }}
      />
    </>
  );
};