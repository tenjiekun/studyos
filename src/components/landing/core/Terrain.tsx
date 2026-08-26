"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Terrain() {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(20, 12, 80, 50);
    const positions = geo.attributes.position;

    // Create mountain-like terrain
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);

      // Height based on distance from center (mountains at edges)
      const dist = Math.sqrt(x * x + y * y);
      let height = 0;

      // Ring of mountains around center
      const ringDist = Math.abs(dist - 6);
      height = Math.max(0, 1.5 - ringDist * 0.5) * (0.5 + Math.sin(x * 0.8) * 0.3 + Math.cos(y * 1.2) * 0.2);

      // Add noise for rocky terrain
      height += Math.sin(x * 2.3 + y * 1.7) * 0.15;
      height += Math.sin(x * 4.1 - y * 3.2) * 0.08;
      height += Math.sin(x * 7.5 + y * 5.8) * 0.04;

      // Flatten center area (where orb sits)
      const centerFlatten = Math.max(0, 1 - dist / 3);
      height *= (1 - centerFlatten);

      positions.setZ(i, height);
    }

    geo.computeVertexNormals();
    return geo;
  }, []);

  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("#0c0a1d"),
    emissive: new THREE.Color("#1e1b4b"),
    emissiveIntensity: 0.15,
    metalness: 0.7,
    roughness: 0.6,
    transparent: true,
    opacity: 0.85,
    flatShading: true,
  }), []);

  useFrame((state) => {
    if (meshRef.current) {
      // Subtle breathing
      const t = state.clock.elapsedTime;
      material.emissiveIntensity = 0.12 + Math.sin(t * 0.3) * 0.05;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -3, 0]}
    />
  );
}

// Vertical light beams rising from the terrain
export function LightBeams() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      groupRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          child.material.opacity = 0.03 + Math.sin(t * 0.5 + i * 2) * 0.02;
        }
      });
    }
  });

  const beamPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const r = 5 + Math.random() * 2;
      positions.push([
        Math.cos(angle) * r,
        0,
        Math.sin(angle) * r,
      ]);
    }
    return positions;
  }, []);

  return (
    <group ref={groupRef}>
      {beamPositions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <cylinderGeometry args={[0.005, 0.03, 6, 8]} />
          <meshBasicMaterial
            color="#6366f1"
            transparent
            opacity={0.04}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}
