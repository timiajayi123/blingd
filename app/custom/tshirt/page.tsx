"use client";

import React, { Suspense } from 'react';
import { Loader } from '@react-three/drei';
import dynamic from 'next/dynamic';
import Configurator from './components/Configurator';

const CanvasModel = dynamic(() => import('./components/CanvasModel'), { 
  ssr: false,
  loading: () => <div className="absolute inset-0 flex items-center justify-center text-xl font-bold">Loading 3D Scene...</div>
});

export default function CustomTshirtPage() {
  return (
    <main className="relative w-full h-[100dvh] bg-gray-100 overflow-hidden">
      <Suspense fallback={null}>
        <CanvasModel />
      </Suspense>
      <Loader />
      <Configurator />
    </main>
  );
}
