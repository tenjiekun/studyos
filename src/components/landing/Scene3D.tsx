"use client";

import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CentralOrb } from "./core/CentralOrb";
import { ParticleField } from "./core/Particles";
import { FloatingElements } from "./core/FloatingElements";

interface Scene3DProps {
  progress: number;
  currentScene: number;
  sceneData: Array<{ id: string; accent: string }>;
}

export function Scene3D({ progress, currentScene, sceneData }: Scene3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const targetCamPos = useRef(new THREE.Vector3(0, 0, 5));

  // Camera positions for each scene
  const cameraKeyframes = useMemo(() => [
    new THREE.Vector3(0, 0, 6),       // hero
    new THREE.Vector3(0, 0.5, 5),     // year
    new THREE.Vector3(1, 0, 4.5),     // syllabus
    new THREE.Vector3(0, -0.5, 5),    // planner
    new THREE.Vector3(-0.5, 0, 4),    // focus
    new THREE.Vector3(0.5, 0.5, 4.5), // progress
    new THREE.Vector3(0, 0, 5),       // tests
    new THREE.Vector3(-0.3, -0.3, 4), // time
    new THREE.Vector3(0, 0.2, 5),     // community
    new THREE.Vector3(0.3, 0, 4.5),   // pro
    new THREE.Vector3(0, -0.2, 5),    // calendar
    new THREE.Vector3(0, 0, 6),       // final
  ], []);

  useFrame((_, delta) => {
    const idx = Math.min(currentScene, cameraKeyframes.length - 1);
    targetCamPos.current.copy(cameraKeyframes[idx]);

    camera.position.lerp(targetCamPos.current, 1 - Math.pow(0.001, delta));
    camera.lookAt(0, 0, 0);

    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        progress * Math.PI * 0.5,
        delta * 2
      );
    }
  });

  const accentColor = sceneData[currentScene]?.accent || "#6366f1";

  return (
    <group ref={groupRef}>
      {/* Ambient lighting */}
      <ambientLight intensity={0.15} color="#8888ff" />

      {/* Main directional light */}
      <directionalLight
        position={[5, 5, 5]}
        intensity={0.5}
        color="#ffffff"
      />

      {/* Accent point light */}
      <pointLight
        position={[0, 2, 3]}
        intensity={0.8}
        color={accentColor}
        distance={15}
      />

      {/* Rim light */}
      <pointLight
        position={[-3, -2, 2]}
        intensity={0.4}
        color="#4f46e5"
        distance={10}
      />

      {/* Central orb */}
      <CentralOrb
        progress={progress}
        currentScene={currentScene}
        accentColor={accentColor}
      />

      {/* Floating elements */}
      <FloatingElements
        progress={progress}
        currentScene={currentScene}
        accentColor={accentColor}
      />

      {/* Particles */}
      <ParticleField
        progress={progress}
        count={800}
      />
    </group>
  );
}
