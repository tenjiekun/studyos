"use client";

import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CentralOrb } from "./core/CentralOrb";
import { ParticleField } from "./core/Particles";
import { FloatingElements } from "./core/FloatingElements";
import { Terrain, LightBeams } from "./core/Terrain";

interface Scene3DProps {
  progress: number;
  currentScene: number;
  sceneData: Array<{ id: string; accent: string }>;
}

export function Scene3D({ progress, currentScene, sceneData }: Scene3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const targetCamPos = useRef(new THREE.Vector3(0, 0, 5));

  // Camera positions for each scene — cinematic movement
  const cameraKeyframes = useMemo(() => [
    new THREE.Vector3(0, 0.3, 6),       // hero — slightly elevated
    new THREE.Vector3(0, 0.8, 5.5),     // year — looking down at months
    new THREE.Vector3(1, 0.2, 5),       // syllabus
    new THREE.Vector3(-0.5, 0, 5.5),    // planner
    new THREE.Vector3(0, 0.5, 4.5),     // focus — closer
    new THREE.Vector3(0.5, 0.3, 5),     // progress
    new THREE.Vector3(0, 0.1, 5.5),     // tests
    new THREE.Vector3(-0.3, -0.2, 4.5), // time
    new THREE.Vector3(0.2, 0.4, 5),     // community
    new THREE.Vector3(0, 0.2, 4.8),     // pro
    new THREE.Vector3(-0.2, 0, 5.5),    // calendar
    new THREE.Vector3(0, 0.3, 7),       // final — pulled back
  ], []);

  useFrame((state, delta) => {
    const idx = Math.min(currentScene, cameraKeyframes.length - 1);
    targetCamPos.current.copy(cameraKeyframes[idx]);

    // Smooth camera interpolation
    camera.position.lerp(targetCamPos.current, 1 - Math.pow(0.0005, delta));
    camera.lookAt(0, 0, 0);

    // Subtle group rotation with scroll
    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        progress * Math.PI * 0.3,
        delta * 1.5
      );
    }
  });

  const accentColor = sceneData[currentScene]?.accent || "#6366f1";

  return (
    <group ref={groupRef}>
      {/* === LIGHTING === */}
      {/* Dim ambient for base visibility */}
      <ambientLight intensity={0.08} color="#1e1b4b" />

      {/* Main directional — moonlight feel */}
      <directionalLight
        position={[3, 8, 5]}
        intensity={0.4}
        color="#c7d2fe"
        castShadow={false}
      />

      {/* Primary accent light — from above */}
      <pointLight
        position={[0, 4, 2]}
        intensity={1.2}
        color={accentColor}
        distance={15}
        decay={2}
      />

      {/* Rim light — behind the orb */}
      <pointLight
        position={[0, 1, -3]}
        intensity={0.8}
        color="#4f46e5"
        distance={10}
        decay={2}
      />

      {/* Side fill light */}
      <pointLight
        position={[-4, -1, 2]}
        intensity={0.3}
        color="#3b82f6"
        distance={8}
        decay={2}
      />

      {/* Bottom up-light for terrain */}
      <pointLight
        position={[0, -4, 0]}
        intensity={0.2}
        color="#6366f1"
        distance={12}
        decay={2}
      />

      {/* === CENTRAL ORB === */}
      <CentralOrb
        progress={progress}
        currentScene={currentScene}
        accentColor={accentColor}
      />

      {/* === TERRAIN === */}
      <Terrain />

      {/* === LIGHT BEAMS === */}
      <LightBeams />

      {/* === FLOATING ELEMENTS === */}
      <FloatingElements
        progress={progress}
        currentScene={currentScene}
        accentColor={accentColor}
      />

      {/* === PARTICLES === */}
      <ParticleField
        progress={progress}
      />

      {/* === FOG for depth === */}
      <fog attach="fog" args={["#050510", 8, 25]} />
    </group>
  );
}
