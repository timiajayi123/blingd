'use client';

import React, { useEffect } from 'react';

export default function OneSignalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // This is just to ensure we don't double-initialize; the actual init is in layout.tsx
    console.log('[OneSignal] Provider ready - initialization handled in layout');
  }, []);

  return <>{children}</>;
}