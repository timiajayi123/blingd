"use client";

import React, { Suspense } from 'react';
import { useSnapshot } from 'valtio';
import { useFrame } from '@react-three/fiber';
import { Decal, useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import state from '../store';

// Using the local model file
const MODEL_URL = "/template-assets/model.glb";

const TextureDecal = ({ url, ...props }: any) => {
  const texture = useTexture(url);
  return <Decal map={texture} {...props} />;
};

const Shirt = () => {
  const snap = useSnapshot(state);
  // @ts-ignore
  const { nodes, materials } = useGLTF(MODEL_URL);

  React.useEffect(() => {
    console.log("Shirt component mounted");
    console.log("Nodes:", nodes);
    console.log("Materials:", materials);
    return () => console.log("Shirt component unmounted");
  }, [nodes, materials]);

  React.useEffect(() => {
    console.log("Shirt State Snapshot:", JSON.stringify(snap));
  }, [snap]);

  // If materials or nodes are missing, don't render
  if (!nodes || !materials) {
      console.log("Shirt: Missing nodes or materials", { nodes, materials });
      return null;
  }

  // Smoothly animate color changes
  useFrame((_, delta) => {
    const fixedDelta = Math.min(delta, 0.1); // Clamp delta to avoid huge jumps
    // @ts-ignore
    if (materials.lambert1) {
      // @ts-ignore
      const color = new THREE.Color(snap.selectedColor);
      // @ts-ignore
      materials.lambert1.color.lerp(color, 0.25 * fixedDelta * 60);
      materials.lambert1.needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh
        frustumCulled={false}
        castShadow
        receiveShadow
        // @ts-ignore
        geometry={nodes.T_Shirt_male.geometry}
        // @ts-ignore
        material={materials.lambert1}
        material-roughness={1}
        dispose={null}
        scale={0.8} // Adjust scale to fit view
        position={[0, -0.4, 0]} // Center vertically
      >
        <Suspense fallback={null}>
          {/* Full Texture (Pattern) */}
          {snap.isFullTexture && snap.fullDecal && (
            <TextureDecal 
              position={[0, 0, 0]} 
              rotation={[0, 0, 0]} 
              scale={1} 
              url={snap.fullDecal} 
            />
          )}

          {/* Logo Decal */}
          {snap.isLogoTexture && snap.logoDecal && (
            <TextureDecal 
              // @ts-ignore
              position={snap.position} 
              rotation={[0, 0, snap.rotation]} 
              scale={snap.scale} 
              url={snap.logoDecal}
              depthTest={false}
              depthWrite={true}
            />
          )}

          {/* Text Decal */}
          {snap.isText && snap.textDecal && (
            <TextureDecal 
              // @ts-ignore
              position={snap.textPosition} 
              rotation={[0, 0, 0]} 
              scale={snap.textScale} 
              url={snap.textDecal}
              depthTest={false}
              depthWrite={true}
            />
          )}

          {/* Shape Decal */}
          {snap.isShape && snap.shapeDecal && (
            <TextureDecal 
              // @ts-ignore
              position={snap.shapePosition} 
              rotation={[0, 0, 0]} 
              scale={snap.shapeScale} 
              url={snap.shapeDecal}
              depthTest={false}
              depthWrite={true}
            />
          )}
        </Suspense>
      </mesh>
    </group>
  );
};

useGLTF.preload(MODEL_URL);

export default Shirt;
