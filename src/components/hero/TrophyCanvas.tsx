'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { Suspense, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Stylized 3D World Cup trophy. Constructed from primitives (no GLTF download
 * needed — keeps bundle thin). Gold PBR material with bloom + chromatic aberration.
 */
function Trophy({ spinBoost }: { spinBoost: number }) {
  const root = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!root.current) return;
    root.current.rotation.y += delta * (0.3 + spinBoost);
  });

  const gold = (
    <meshPhysicalMaterial
      color="#fcb800"
      metalness={1}
      roughness={0.18}
      clearcoat={1}
      clearcoatRoughness={0.2}
      reflectivity={1}
      envMapIntensity={1.4}
    />
  );

  return (
    <group ref={root} position={[0, -0.4, 0]}>
      {/* Base — two stacked rings (the marble base of the real trophy) */}
      <mesh position={[0, -1.4, 0]} castShadow>
        <cylinderGeometry args={[1.05, 1.05, 0.18, 64]} />
        <meshPhysicalMaterial color="#1a1a24" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, -1.22, 0]} castShadow>
        <cylinderGeometry args={[0.95, 1.05, 0.16, 64]} />
        <meshPhysicalMaterial color="#262630" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* Stem */}
      <mesh position={[0, -0.85, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.55, 0.5, 64]} />
        {gold}
      </mesh>

      {/* Twisting middle */}
      <mesh position={[0, -0.3, 0]} castShadow>
        <torusKnotGeometry args={[0.3, 0.12, 96, 16, 2, 3]} />
        {gold}
      </mesh>

      {/* Cup body */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <sphereGeometry args={[0.62, 64, 64, 0, Math.PI * 2, 0, Math.PI * 0.7]} />
        {gold}
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <torusGeometry args={[0.62, 0.04, 16, 96]} />
        {gold}
      </mesh>
    </group>
  );
}

export function TrophyCanvas() {
  const [spinBoost, setSpinBoost] = useState(0);

  const onClick = () => {
    setSpinBoost(4);
    setTimeout(() => setSpinBoost(0), 1200);
  };

  return (
    <div className="absolute inset-0 cursor-pointer" onClick={onClick}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0.4, 5], fov: 30 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      >
        <color attach="background" args={[0, 0, 0]} />
        <fog attach="fog" args={['#0a0a14', 6, 12]} />

        <Suspense fallback={null}>
          <ambientLight intensity={0.25} />
          <directionalLight position={[3, 4, 2]} intensity={2.5} castShadow color="#fff3d9" />
          <directionalLight position={[-3, 2, -2]} intensity={1.0} color="#a48bff" />
          <pointLight position={[0, -2, 2]} intensity={0.6} color="#fcb800" />

          <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
            <Trophy spinBoost={spinBoost} />
          </Float>

          <Environment preset="warehouse" />

          <EffectComposer>
            <Bloom intensity={0.55} luminanceThreshold={0.6} luminanceSmoothing={0.6} mipmapBlur />
            <ChromaticAberration offset={new THREE.Vector2(0.0007, 0.0007)} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* radial vignette to anchor the trophy */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 50% 30% at 50% 90%, oklch(0.80 0.18 75 / 0.20), transparent 70%)',
        }}
      />
    </div>
  );
}
