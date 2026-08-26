"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface FloatingElementsProps {
  progress: number;
  currentScene: number;
  accentColor: string;
}

interface FloatingCard {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  speed: number;
  offset: number;
}

export function FloatingElements({ progress, currentScene, accentColor }: FloatingElementsProps) {
  const groupRef = useRef<THREE.Group>(null);

  const cards = useMemo<FloatingCard[]>(() => {
    const items: FloatingCard[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 2.5 + Math.sin(i * 1.7) * 0.8;
      items.push({
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * 2,
          Math.sin(angle) * radius
        ),
        rotation: new THREE.Euler(
          Math.random() * 0.3,
          angle + Math.PI / 2,
          Math.random() * 0.2
        ),
        scale: 0.3 + Math.random() * 0.3,
        speed: 0.2 + Math.random() * 0.3,
        offset: Math.random() * Math.PI * 2,
      });
    }
    return items;
  }, []);

  const cardMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(accentColor),
    emissive: new THREE.Color(accentColor),
    emissiveIntensity: 0.15,
    metalness: 0.7,
    roughness: 0.3,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
  }), [accentColor]);

  const ringMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(accentColor),
    emissive: new THREE.Color(accentColor),
    emissiveIntensity: 0.1,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
  }), [accentColor]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    // Slow rotation of all floating elements
    groupRef.current.rotation.y = t * 0.05 + progress * Math.PI * 0.4;

    // Animate each card
    groupRef.current.children.forEach((child, i) => {
      if (i < cards.length) {
        const card = cards[i];
        child.position.y = card.position.y + Math.sin(t * card.speed + card.offset) * 0.3;
        child.rotation.x = card.rotation.x + Math.sin(t * card.speed * 0.5) * 0.1;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {/* Floating glass panels */}
      {cards.map((card, i) => (
        <mesh
          key={`card-${i}`}
          position={card.position.toArray()}
          rotation={card.rotation}
          scale={card.scale}
          material={cardMat}
        >
          <planeGeometry args={[1.2, 0.8, 1, 1]} />
        </mesh>
      ))}

      {/* Orbiting rings */}
      <mesh rotation={[Math.PI / 3, 0, 0]} material={ringMat}>
        <torusGeometry args={[3.5, 0.005, 8, 64]} />
      </mesh>
      <mesh rotation={[0, Math.PI / 4, Math.PI / 5]} material={ringMat}>
        <torusGeometry args={[4, 0.005, 8, 64]} />
      </mesh>
      <mesh rotation={[Math.PI / 6, Math.PI / 3, 0]} material={ringMat}>
        <torusGeometry args={[4.5, 0.003, 8, 64]} />
      </mesh>
    </group>
  );
}
