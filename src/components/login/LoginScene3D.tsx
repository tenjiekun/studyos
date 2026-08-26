"use client";

import { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { Suspense } from "react";
import * as THREE from "three";
import { CentralOrb } from "@/components/landing/core/CentralOrb";
import { ParticleField } from "@/components/landing/core/Particles";
import { Terrain } from "@/components/landing/core/Terrain";

function LoginCamera() {
  const { camera, gl } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const smoothMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const dom = gl.domElement;
    const handleMove = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    dom.addEventListener("pointermove", handleMove, { passive: true });
    return () => dom.removeEventListener("pointermove", handleMove);
  }, [gl.domElement]);

  useFrame((_, delta) => {
    const lerpFactor = 1 - Math.pow(0.02, delta);
    smoothMouse.current.x = THREE.MathUtils.lerp(smoothMouse.current.x, mouse.current.x, lerpFactor);
    smoothMouse.current.y = THREE.MathUtils.lerp(smoothMouse.current.y, mouse.current.y, lerpFactor);

    const mx = smoothMouse.current.x;
    const my = smoothMouse.current.y;

    camera.position.set(mx * 0.2, 0.3 + my * 0.1, 5);
    camera.lookAt(mx * 0.3, my * 0.2, 0);
  });

  return null;
}

export function LoginScene3D() {
  return (
    <Canvas
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.3, 5], fov: 50 }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Suspense fallback={null}>
        <LoginCamera />

        {/* Lighting */}
        <ambientLight intensity={0.08} color="#1e1b4b" />
        <directionalLight position={[3, 8, 5]} intensity={0.4} color="#c7d2fe" />
        <pointLight position={[0, 4, 2]} intensity={1.2} color="#6366f1" distance={15} decay={2} />
        <pointLight position={[0, 1, -3]} intensity={0.8} color="#4f46e5" distance={10} decay={2} />
        <pointLight position={[-4, -1, 2]} intensity={0.3} color="#3b82f6" distance={8} decay={2} />

        {/* Core */}
        <CentralOrb progress={0} currentScene={0} accentColor="#6366f1" />

        {/* Terrain */}
        <Terrain />

        {/* Particles */}
        <ParticleField progress={0} />

        <Environment preset="night" />
        <fog attach="fog" args={["#050510", 8, 25]} />
      </Suspense>
    </Canvas>
  );
}
