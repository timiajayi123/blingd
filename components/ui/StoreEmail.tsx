'use client';

import { useEffect } from 'react';

export default function StoreEmail() {
  useEffect(() => {
    // Guest-first model: No longer fetching account info globally
    // If you need to store a guest email, do it at checkout.
  }, []);

  return null; // Nothing to render
}
