'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { VFXEmitter } from 'wawa-vfx';
import * as THREE from 'three';

interface VFXLightningProps {
  startPosition: [number, number, number];
  endPosition: [number, number, number];
  onComplete: () => void;
  vfxRef?: React.RefObject<any>;
}

export const VFXLightning: React.FC<VFXLightningProps> = ({
  startPosition,
  endPosition,
  onComplete
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const emitterRef = useRef<any>(null);
  const lifetime = useRef(0);

  // Generate lightning path with random offsets
  const points = useMemo(() => {
    const start = new THREE.Vector3(...startPosition);
    const end = new THREE.Vector3(...endPosition);
    const segments = 10;
    const pts: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const point = new THREE.Vector3().lerpVectors(start, end, t);

      // Add random offset for middle points
      if (i > 0 && i < segments) {
        point.x += (Math.random() - 0.5) * 0.3;
        point.y += (Math.random() - 0.5) * 0.3;
        point.z += (Math.random() - 0.5) * 0.3;
      }

      pts.push(point);
    }

    return pts;
  }, [startPosition, endPosition]);

  // Create geometry from points
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [points]);

  useEffect(() => {
    lifetime.current = 0;

    // Start emitting particles
    if (emitterRef.current) {
      emitterRef.current.startEmitting(true);
    }
  }, [startPosition, endPosition]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    lifetime.current += delta;

    // Pulsing effect
    const intensity = Math.sin(lifetime.current * 20) * 0.5 + 0.5;
    groupRef.current.scale.setScalar(0.8 + intensity * 0.4);

    // Complete after duration
    if (lifetime.current > 0.5) {
      if (emitterRef.current) {
        emitterRef.current.stopEmitting();
      }
      onComplete();
    }
  });

  // Calculate midpoint for emitter position
  const midPoint: [number, number, number] = [
    (startPosition[0] + endPosition[0]) / 2,
    (startPosition[1] + endPosition[1]) / 2,
    (startPosition[2] + endPosition[2]) / 2,
  ];

  return (
    <>
      <group ref={groupRef}>
        {/* Main lightning bolt */}
        <line geometry={geometry}>
          <lineBasicMaterial
            color="#6699ff"
            transparent
            opacity={0.8}
            linewidth={3}
          />
        </line>

        {/* Glow effect */}
        <line geometry={geometry}>
          <lineBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.5}
            linewidth={1}
          />
        </line>

        {/* Point lights at key positions */}
        <pointLight
          position={startPosition}
          color="#6699ff"
          intensity={3}
          distance={10}
        />
        <pointLight
          position={endPosition}
          color="#6699ff"
          intensity={5}
          distance={10}
        />
      </group>

      {/* Particle emitter for sparks */}
      <VFXEmitter
        ref={emitterRef}
        emitter="lightningSparks"
        autoStart={false}
        settings={{
          loop: false,
          duration: 0.3,
          nbParticles: 50,
          spawnMode: "burst",
          particlesLifetime: [0.1, 0.3],
          startPositionMin: midPoint,
          startPositionMax: midPoint,
          directionMin: [-2, -2, -2],
          directionMax: [2, 2, 2],
          size: [0.05, 0.15],
          speed: [5, 15],
          colorStart: ["#ffffff", "#aaccff"],
          colorEnd: ["#6699ff", "#3366cc"],
        }}
      />
    </>
  );
};