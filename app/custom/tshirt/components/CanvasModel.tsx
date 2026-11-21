"use client";

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Center, OrbitControls, ContactShadows } from '@react-three/drei';
import { useSnapshot } from 'valtio';
import state from '../store';
import Shirt from './Shirt';
import CameraRig from './CameraRig';
import Backdrop from './Backdrop';
import ErrorBoundary from '@/components/ErrorBoundary';

const FallbackShirt = () => (
  <mesh scale={0.8} position={[0, -0.4, 0]}>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="gray" />
  </mesh>
);

const CanvasModel = () => {
  const snap = useSnapshot(state);
  
  console.log("CanvasModel component mounted");
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0, 2.5], fov: 25 }}
      gl={{ preserveDrawingBuffer: true }}
      className="w-full max-w-full h-full transition-all ease-in"
    >
      <ambientLight intensity={0.5} />
      <Environment files="/placeholder.svg" />

      <CameraRig>
        <Backdrop />
        <Center>
          <ErrorBoundary fallback={<FallbackShirt />}>
             <Shirt />
          </ErrorBoundary>
        </Center>
      </CameraRig>
      
      {/* Contact shadows for realism */}
      <ContactShadows position={[0, -0.8, 0]} opacity={0.25} scale={10} blur={1.5} far={0.8} />

      {/* OrbitControls for user interaction - Enabled only in 3D mode */}
      <OrbitControls 
        enabled={snap.is3D}
        enablePan={false}
        enableZoom={true}
        minPolarAngle={Math.PI / 4} // Don't allow viewing from too high above
        maxPolarAngle={Math.PI / 2} // Don't allow viewing from below ground
        minDistance={1.5}
        maxDistance={4}
      />
    </Canvas>
  );
};

export default CanvasModel;
