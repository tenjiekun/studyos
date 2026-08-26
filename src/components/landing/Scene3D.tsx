"use client";

import { useRef, useMemo, useEffect } from "react";
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
  const { camera, gl } = useThree();
  const targetCamPos = useRef(new THREE.Vector3(0, 0, 5));

  // Mouse tracking — normalized -1 to 1
  const mouse = useRef({ x: 0, y: 0 });
  const smoothMouse = useRef({ x: 0, y: 0 });

  // Listen to pointermove on the canvas
  useEffect(() => {
    const dom = gl.domElement;
    const handleMove = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    dom.addEventListener("pointermove", handleMove, { passive: true });
    return () => dom.removeEventListener("pointermove", handleMove);
  }, [gl.domElement]);

  // Camera positions for each scene — cinematic movement
  const cameraKeyframes = useMemo(() => [
    new THREE.Vector3(0, 0.3, 6),       // hero
    new THREE.Vector3(0, 0.8, 5.5),     // year
    new THREE.Vector3(1, 0.2, 5),       // syllabus
    new THREE.Vector3(-0.5, 0, 5.5),    // planner
    new THREE.Vector3(0, 0.5, 4.5),     // focus
    new THREE.Vector3(0.5, 0.3, 5),     // progress
    new THREE.Vector3(0, 0.1, 5.5),     // tests
    new THREE.Vector3(-0.3, -0.2, 4.5), // time
    new THREE.Vector3(0.2, 0.4, 5),     // community
    new THREE.Vector3(0, 0.2, 4.8),     // pro
    new THREE.Vector3(-0.2, 0, 5.5),    // calendar
    new THREE.Vector3(0, 0.3, 7),       // final
  ], []);

  useFrame((state, delta) => {
    const idx = Math.min(currentScene, cameraKeyframes.length - 1);
    targetCamPos.current.copy(cameraKeyframes[idx]);

    // Smooth mouse interpolation (lerp toward raw mouse)
    const lerpFactor = 1 - Math.pow(0.02, delta);
    smoothMouse.current.x = THREE.MathUtils.lerp(smoothMouse.current.x, mouse.current.x, lerpFactor);
    smoothMouse.current.y = THREE.MathUtils.lerp(smoothMouse.current.y, mouse.current.y, lerpFactor);

    const mx = smoothMouse.current.x;
    const my = smoothMouse.current.y;

    // Apply mouse offset to camera lookAt target — subtle parallax
    const lookAtTarget = new THREE.Vector3(
      mx * 0.4,  // horizontal shift
      my * 0.25, // vertical shift
      0
    );

    // Smooth camera interpolation with parallax lookAt
    camera.position.lerp(targetCamPos.current, 1 - Math.pow(0.0005, delta));
    camera.lookAt(lookAtTarget);

    // Subtle group rotation — adds to the parallax feel
    if (groupRef.current) {
      // Scroll-driven rotation
      const scrollRot = progress * Math.PI * 0.3;
      // Mouse-driven rotation (smaller range)
      const mouseRotY = mx * 0.08;
      const mouseRotX = my * 0.04;

      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        scrollRot + mouseRotY,
        delta * 2
      );
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        mouseRotX,
        delta * 2
      );

      // Subtle position shift for depth
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        mx * 0.15,
        delta * 1.5
      );
      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y,
        my * 0.1,
        delta * 1.5
      );
    }
  });

  const accentColor = sceneData[currentScene]?.accent || "#6366f1";

  return (
    <group ref={groupRef}>
      {/* === LIGHTING === */}
      <ambientLight intensity={0.08} color="#1e1b4b" />

      <directionalLight
        position={[3, 8, 5]}
        intensity={0.4}
        color="#c7d2fe"
        castShadow={false}
      />

      <pointLight
        position={[0, 4, 2]}
        intensity={1.2}
        color={accentColor}
        distance={15}
        decay={2}
      />

      <pointLight
        position={[0, 1, -3]}
        intensity={0.8}
        color="#4f46e5"
        distance={10}
        decay={2}
      />

      <pointLight
        position={[-4, -1, 2]}
        intensity={0.3}
        color="#3b82f6"
        distance={8}
        decay={2}
      />

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

      {/* === FOG === */}
      <fog attach="fog" args={["#050510", 8, 25]} />
    </group>
  );
}
