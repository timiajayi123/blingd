"use client";

import { track } from "@vercel/analytics";

export const trackEvent = async (type: string, metadata?: any) => {
  try {
    track(type, metadata || {});
  } catch (error) {
    console.error("Failed to track event", error);
  }
};
