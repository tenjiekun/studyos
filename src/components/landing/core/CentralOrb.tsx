"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface CentralOrbProps {
  progress: number;
  currentScene: number;
  accentColor: string;
}

// Orbiting feature cards data (like the reference image)
const FEATURE_CARDS = [
  { label: "Planner", sub: "Your Study Plan", icon: "📋", angle: 0, radius: 2.2, yOffset: 0.8 },
  { label: "Timer", sub: "Every Session Tracked", icon: "⏱️", angle: Math.PI * 0.4, radius: 2.0, yOffset: -0.3 },
  { label: "Community", sub: "Learn Together", icon: "👥", angle: Math.PI * 0.8, radius: 2.3, yOffset: 0.2 },
  { label: "Calendar", sub: "Sync & Stay Organized", icon: "📅", angle: Math.PI * 1.2, radius: 2.1, yOffset: -0.6 },
  { label: "Progress", sub: "68% Syllabus Done", icon: "📊", angle: Math.PI * 1.6, radius: 2.4, yOffset: 0.5 },
];

export function CentralOrb({ progress, currentScene, accentColor }: CentralOrbProps) {
  const coreRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  const ring4Ref = useRef<THREE.Mesh>(null);
  const cardsRef = useRef<THREE.Group>(null);

  const accent = useMemo(() => new THREE.Color(accentColor), [accentColor]);
  const purple = useMemo(() => new THREE.Color("#7c3aed"), []);
  const blue = useMemo(() => new THREE.Color("#3b82f6"), []);

  // Core crystal material
  const coreMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#1a1040"),
    emissive: new THREE.Color("#4338ca"),
    emissiveIntensity: 0.6,
    metalness: 0.9,
    roughness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    transmission: 0.3,
    thickness: 2,
    transparent: true,
    opacity: 0.95,
    envMapIntensity: 2,
  }), []);

  // Inner crystal shards material
  const shardMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#2e1065"),
    emissive: new THREE.Color("#6366f1"),
    emissiveIntensity: 0.8,
    metalness: 0.95,
    roughness: 0.1,
    clearcoat: 1,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  }), []);

  // Glow sphere
  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#4f46e5"),
    transparent: true,
    opacity: 0.06,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  }), []);

  // Ring materials
  const ringMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    metalness: 1,
    roughness: 0,
  }), [accent]);

  const ringMat2 = useMemo(() => new THREE.MeshStandardMaterial({
    color: purple,
    emissive: purple,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    metalness: 1,
    roughness: 0,
  }), [purple]);

  // Feature card material (small glowing planes)
  const cardMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#1e1b4b"),
    emissive: new THREE.Color("#6366f1"),
    emissiveIntensity: 0.3,
    metalness: 0.7,
    roughness: 0.2,
    clearcoat: 0.8,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  }), []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const pProgress = progress * Math.PI * 2;

    // Main group rotation
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.15;
    }

    // Inner crystal rotation (counter-rotate for depth)
    if (innerRef.current) {
      innerRef.current.rotation.y -= delta * 0.3;
      innerRef.current.rotation.x = Math.sin(t * 0.5) * 0.15;
      const breathe = 0.85 + Math.sin(t * 1.2) * 0.08;
      innerRef.current.scale.setScalar(breathe);
    }

    // Glow pulse
    if (glowRef.current) {
      const pulse = 1.0 + Math.sin(t * 0.8) * 0.15;
      glowRef.current.scale.setScalar(pulse);
      glowMat.opacity = 0.04 + Math.sin(t * 1.5) * 0.02;
    }

    // Ring rotations — each at different speeds and axes
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x += delta * 0.25;
      ring1Ref.current.rotation.z += delta * 0.1;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y += delta * 0.35;
      ring2Ref.current.rotation.x -= delta * 0.08;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.z += delta * 0.2;
      ring3Ref.current.rotation.y -= delta * 0.12;
    }
    if (ring4Ref.current) {
      ring4Ref.current.rotation.x -= delta * 0.3;
      ring4Ref.current.rotation.z += delta * 0.15;
    }

    // Orbiting feature cards
    if (cardsRef.current) {
      cardsRef.current.rotation.y += delta * 0.08;
      cardsRef.current.children.forEach((child, i) => {
        if (i < FEATURE_CARDS.length) {
          const card = FEATURE_CARDS[i];
          const cardT = t * 0.5 + card.angle;
          child.position.x = Math.cos(cardT) * card.radius;
          child.position.z = Math.sin(cardT) * card.radius;
          child.position.y = card.yOffset + Math.sin(t * 0.7 + i) * 0.15;
          // Cards face the camera
          child.lookAt(0, child.position.y, 0);
          // Subtle floating
          const floatScale = 0.95 + Math.sin(t * 1.2 + i * 1.5) * 0.05;
          child.scale.setScalar(floatScale);
        }
      });
    }

    // Emissive pulse on inner shards
    const emPulse = 0.6 + Math.sin(t * 2) * 0.3;
    shardMat.emissiveIntensity = emPulse;
  });

  return (
    <group ref={coreRef}>
      {/* === CORE CRYSTAL === */}
      {/* Main octahedron */}
      <mesh ref={innerRef} material={shardMat}>
        <octahedronGeometry args={[0.7, 2]} />
      </mesh>

      {/* Inner icosahedron shell */}
      <mesh material={coreMat}>
        <icosahedronGeometry args={[0.55, 3]} />
      </mesh>

      {/* === GLOW VOLUMES === */}
      <mesh ref={glowRef} material={glowMat}>
        <sphereGeometry args={[1.4, 32, 32]} />
      </mesh>

      {/* Second larger glow */}
      <mesh>
        <sphereGeometry args={[2.0, 32, 32]} />
        <meshBasicMaterial
          color="#312e81"
          transparent
          opacity={0.02}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* === ORBITING RINGS === */}
      {/* Ring 1 — main horizontal */}
      <mesh ref={ring1Ref} material={ringMat}>
        <torusGeometry args={[1.3, 0.012, 16, 128]} />
      </mesh>

      {/* Ring 2 — tilted */}
      <mesh ref={ring2Ref} material={ringMat2} rotation={[0.7, 0, 0.4]}>
        <torusGeometry args={[1.6, 0.008, 16, 128]} />
      </mesh>

      {/* Ring 3 — another tilt */}
      <mesh ref={ring3Ref} material={ringMat} rotation={[0.3, 0.6, 0]}>
        <torusGeometry args={[1.9, 0.006, 16, 128]} />
      </mesh>

      {/* Ring 4 — outermost thin ring */}
      <mesh ref={ring4Ref} material={ringMat2} rotation={[1.1, 0.2, 0.3]}>
        <torusGeometry args={[2.2, 0.004, 16, 128]} />
      </mesh>

      {/* === ORBITING FEATURE CARDS === */}
      <group ref={cardsRef}>
        {FEATURE_CARDS.map((card, i) => (
          <group key={i} position={[0, card.yOffset, card.radius]}>
            {/* Card body */}
            <mesh material={cardMat}>
              <planeGeometry args={[0.55, 0.32]} />
            </mesh>
            {/* Card border glow */}
            <mesh position={[0, 0, -0.001]}>
              <planeGeometry args={[0.58, 0.35]} />
              <meshBasicMaterial
                color="#6366f1"
                transparent
                opacity={0.15}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Small indicator dot */}
            <mesh position={[-0.22, 0.1, 0.001]}>
              <circleGeometry args={[0.02, 16]} />
              <meshBasicMaterial color="#818cf8" />
            </mesh>
          </group>
        ))}
      </group>

      {/* === POINT LIGHTS === */}
      <pointLight
        position={[0, 0, 0]}
        intensity={1.5}
        color="#6366f1"
        distance={8}
      />
      <pointLight
        position={[0, 1.5, 0]}
        intensity={0.6}
        color="#a78bfa"
        distance={6}
      />
      <pointLight
        position={[1, -0.5, 1]}
        intensity={0.4}
        color="#3b82f6"
        distance={5}
      />
    </group>
  );
}
