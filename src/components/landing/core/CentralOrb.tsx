"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface CentralOrbProps {
  progress: number;
  currentScene: number;
  accentColor: string;
}

export function CentralOrb({ progress, currentScene, accentColor }: CentralOrbProps) {
  const coreRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const coreMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(accentColor),
    emissive: new THREE.Color(accentColor),
    emissiveIntensity: 0.3,
    metalness: 0.8,
    roughness: 0.2,
    transparent: true,
    opacity: 0.9,
  }), [accentColor]);

  const ringMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(accentColor),
    emissive: new THREE.Color(accentColor),
    emissiveIntensity: 0.2,
    metalness: 0.9,
    roughness: 0.1,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
  }), [accentColor]);

  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(accentColor),
    transparent: true,
    opacity: 0.08,
    side: THREE.BackSide,
  }), [accentColor]);

  useFrame((_, delta) => {
    const t = progress * Math.PI * 2;

    // Core rotation
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.3;
      coreRef.current.rotation.x = Math.sin(t * 0.5) * 0.1;
      const scale = 0.8 + Math.sin(t) * 0.15;
      coreRef.current.scale.setScalar(scale);
    }

    // Rings rotation
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x += delta * 0.5;
      ring1Ref.current.rotation.z += delta * 0.2;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y += delta * 0.4;
      ring2Ref.current.rotation.x += delta * 0.1;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.z += delta * 0.3;
      ring3Ref.current.rotation.y -= delta * 0.15;
    }

    // Glow pulse
    if (glowRef.current) {
      const pulse = 1 + Math.sin(t * 2) * 0.1;
      glowRef.current.scale.setScalar(pulse);
      glowMat.opacity = 0.06 + Math.sin(t * 3) * 0.02;
    }
  });

  return (
    <group>
      {/* Core sphere */}
      <mesh ref={coreRef} material={coreMat}>
        <icosahedronGeometry args={[0.6, 4]} />
      </mesh>

      {/* Ring 1 - horizontal */}
      <mesh ref={ring1Ref} material={ringMat}>
        <torusGeometry args={[1.1, 0.015, 16, 64]} />
      </mesh>

      {/* Ring 2 - tilted */}
      <mesh ref={ring2Ref} material={ringMat} rotation={[0.8, 0, 0.3]}>
        <torusGeometry args={[1.3, 0.01, 16, 64]} />
      </mesh>

      {/* Ring 3 - another tilt */}
      <mesh ref={ring3Ref} material={ringMat} rotation={[0.3, 0.5, 0]}>
        <torusGeometry args={[1.5, 0.008, 16, 64]} />
      </mesh>

      {/* Outer glow */}
      <mesh ref={glowRef} material={glowMat}>
        <sphereGeometry args={[1.2, 32, 32]} />
      </mesh>

      {/* Inner light */}
      <pointLight
        position={[0, 0, 0]}
        intensity={0.5}
        color={accentColor}
        distance={5}
      />
    </group>
  );
}
