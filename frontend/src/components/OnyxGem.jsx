import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, MeshTransmissionMaterial } from '@react-three/drei';
import { useReducedMotion } from 'framer-motion';
import * as THREE from 'three';

// A low-poly dark crystal rotates slowly and follows a desktop pointer.
function Crystal() {
  const mesh = useRef(null);
  const reduceMotion = useReducedMotion();
  const pointer = useRef(new THREE.Vector2());
  useFrame((state, delta) => {
    if (!mesh.current) return;
    mesh.current.rotation.y += delta * (reduceMotion ? 0.12 : 0.18);
    const canTrack = !reduceMotion && window.matchMedia('(pointer: fine)').matches;
    const targetX = canTrack ? state.pointer.y * 0.22 : 0;
    const targetY = canTrack ? state.pointer.x * 0.32 : 0;
    mesh.current.rotation.x = THREE.MathUtils.damp(mesh.current.rotation.x, targetX, 3, delta);
    mesh.current.rotation.z = THREE.MathUtils.damp(mesh.current.rotation.z, -targetY * 0.2, 3, delta);
    pointer.current.set(targetX, targetY);
  });
  return <mesh ref={mesh} scale={1.45}>
    <icosahedronGeometry args={[1, 1]} />
    <meshPhysicalMaterial color="#080809" metalness={0.82} roughness={0.16} clearcoat={1} clearcoatRoughness={0.12} flatShading />
  </mesh>;
}

export default function OnyxGem() {
  return <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 4.2], fov: 38 }} gl={{ alpha: true, antialias: true }}>
    <ambientLight intensity={0.55} />
    <directionalLight position={[3, 2, 4]} intensity={2.4} color="#fff7e8" />
    <pointLight position={[-2, 1, -1]} intensity={18} color="#c8a25e" />
    <pointLight position={[2, -2, 2]} intensity={5} color="#e8d2a6" />
    <Crystal />
    <Environment preset="city" />
  </Canvas>;
}
