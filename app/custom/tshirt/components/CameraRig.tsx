"use client";

import { useFrame } from '@react-three/fiber';
import { easing } from 'maath';
import { useSnapshot } from 'valtio';
import { useRef } from 'react';
import state from '../store';

const CameraRig = ({ children }: { children: React.ReactNode }) => {
  const group = useRef<any>(null);
  const snap = useSnapshot(state);

  useFrame((state, delta) => {
    // Set initial camera position
    let targetPosition: [number, number, number] = [-0.4, 0, 2];
    
    // Only strictly enforce camera position in 2D mode
    if (!snap.is3D) {
       targetPosition = [0, 0, 1.5]; // Zoomed in front view for 2D mode
       // @ts-ignore
       easing.damp3(state.camera.position, targetPosition, 0.25, delta);
       
       // Lock rotation to front in 2D mode
       if (group.current) {
          // @ts-ignore
          easing.dampE(group.current.rotation, [0, 0, 0], 0.25, delta);
       }
    } 
    // In 3D mode, we just want to set the initial position once, but OrbitControls handles the rest.
    // However, to keep the "responsive" start position, we can dampen to it IF the user isn't controlling?
    // Actually, damp3 fights OrbitControls. So we skip damp3 in 3D mode.
    // But we still want the "parallax" tilt effect on the model itself? 
    // No, users want to rotate freely. So we remove the parallax rotation.
  });

  const Group = 'group' as any;
  return <Group ref={group}>{children}</Group>;
};

export default CameraRig;
