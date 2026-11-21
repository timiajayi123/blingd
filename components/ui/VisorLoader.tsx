"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";

type VisorLoaderProps = {
  /** Set this only when the content the loader protects is actually ready. */
  ready: boolean;
  onComplete?: () => void;
  color?: string;
  imageSrc?: string;
};

const WAVE_A = "M0 12 C140 -8 250 30 390 10 S650 -8 790 12 S1040 30 1180 10 S1320 -8 1440 12 V820 H0 Z";
const WAVE_B = "M0 12 C140 32 250 -8 390 12 S650 32 790 12 S1040 -8 1180 12 S1320 32 1440 12 V820 H0 Z";

/**
 * A stationary visor that acts as a visual progress indicator. The lenses
 * begin neutral grey, then a black liquid rises within the SVG lens shape while the
 * original image keeps the frame and specular highlights intact.
 */
export default function VisorLoader({
  ready,
  onComplete,
  color = "#92959b",
  imageSrc = "/images/visor-loader.png",
}: VisorLoaderProps) {
  const reducedMotion = useReducedMotion();
  const [progress, setProgress] = useState(3);
  const [finished, setFinished] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const completionStarted = useRef(false);
  const maskId = useId().replace(/:/g, "");

  // Image preloading happens independently of the page-ready signal, avoiding
  // a flash of an empty SVG on slower connections.
  useEffect(() => {
    const image = new Image();
    const markImageReady = () => setImageReady(true);
    image.onload = markImageReady;
    image.onerror = markImageReady;
    image.src = imageSrc;
    if (image.complete) {
      image.decode?.().then(markImageReady).catch(markImageReady);
    }
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [imageSrc]);

  const canFinish = ready && imageReady;

  // While content is loading, approach (but never reach) 88%. Once the caller
  // confirms readiness, the final 12% becomes an honest completion animation.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      setProgress((current) => {
        const cap = canFinish ? 100 : 88;
        const distance = cap - current;
        if (distance <= 0.15) return cap;
        return Math.min(cap, current + Math.max(0.12, distance * (canFinish ? 0.08 : 0.018)));
      });
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [canFinish]);

  useEffect(() => {
    if (!canFinish || progress < 99.85 || completionStarted.current) return;
    completionStarted.current = true;
    setProgress(100);
    const timer = window.setTimeout(() => {
      setIsFading(true);
    }, reducedMotion ? 50 : 220);
    return () => window.clearTimeout(timer);
  }, [canFinish, progress, reducedMotion]);

  useEffect(() => {
    if (!isFading) return;
    const timer = window.setTimeout(() => {
      setFinished(true);
      onComplete?.();
    }, reducedMotion ? 100 : 220);
    return () => window.clearTimeout(timer);
  }, [isFading, onComplete, reducedMotion]);

  const fillTop = 800 - progress * 4.85;

  return (
    <motion.div
      aria-busy={!finished}
      aria-label="Loading site"
      initial={{ opacity: 1 }}
      animate={{ opacity: isFading ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0.15 : 0.45, ease: "easeOut" }}
      className="fixed inset-0 z-[9999] grid place-items-center overflow-hidden bg-black/8 px-6 backdrop-blur-[0.5px]"
    >
      <div className="w-full max-w-[900px]">
        <svg
          viewBox="0 0 1440 1080"
          role="img"
          aria-label="Colour-tinted visor sunglasses filling with black"
          className="h-auto w-full overflow-visible"
          style={{ isolation: "isolate" }}
        >
          <defs>
            <filter id={`${maskId}-outline`} x="-5%" y="-5%" width="110%" height="110%">
              <feMorphology in="SourceAlpha" operator="dilate" radius="5" result="outline" />
              <feFlood floodColor="#fff" result="white" />
              <feComposite in="white" in2="outline" operator="in" result="whiteOutline" />
              <feComposite in="SourceGraphic" in2="whiteOutline" operator="over" />
            </filter>
            <clipPath id={maskId}>
              <path d="M188 383 C370 342 1068 342 1252 383 C1261 489 1240 625 1165 702 C1081 782 893 789 815 747 C780 727 765 670 730 650 C695 670 680 727 645 747 C567 789 379 782 295 702 C220 625 199 489 188 383 Z" />
            </clipPath>
            <linearGradient id={`${maskId}-tint`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="0.08" stopColor={color} stopOpacity="0.9" />
              <stop offset="1" stopColor={color} stopOpacity="0.68" />
            </linearGradient>
            <linearGradient id={`${maskId}-liquid`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#24262a" stopOpacity="0.94" />
              <stop offset="0.18" stopColor="#101114" stopOpacity="0.96" />
              <stop offset="1" stopColor="#020202" stopOpacity="0.98" />
            </linearGradient>
            <linearGradient id={`${maskId}-shine`} x1="0" x2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.46" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.52" stopColor="#fff" stopOpacity="0.9" />
              <stop offset="0.58" stopColor="#fff" stopOpacity="0" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>

          <image
            href={imageSrc}
            width="1440"
            height="1080"
            preserveAspectRatio="xMidYMid meet"
            filter={`url(#${maskId}-outline)`}
          />

          {/* The coloured glass is the starting state. */}
          <g clipPath={`url(#${maskId})`} style={{ mixBlendMode: "normal", opacity: 0.78 }}>
            <path d="M188 383 C370 342 1068 342 1252 383 C1261 489 1240 625 1165 702 C1081 782 893 789 815 747 C780 727 765 670 730 650 C695 670 680 727 645 747 C567 789 379 782 295 702 C220 625 199 489 188 383 Z" fill={`url(#${maskId}-tint)`} />
          </g>

          {/* A black liquid wave rises from the bottom as loading completes. */}
          <g clipPath={`url(#${maskId})`} style={{ mixBlendMode: "normal", opacity: 0.9 }}>
            <g transform={`translate(0 ${fillTop})`}>
              <motion.path
                d={WAVE_A}
                animate={reducedMotion ? undefined : { d: [WAVE_A, WAVE_B, WAVE_A] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                fill={`url(#${maskId}-liquid)`}
              />
            </g>
          </g>

          {progress >= 100 && (
            <g clipPath={`url(#${maskId})`} style={{ mixBlendMode: "normal" }}>
              <motion.rect
                y="300"
                width="560"
                height="520"
                fill={`url(#${maskId}-shine)`}
                initial={{ x: -560, opacity: 0 }}
                animate={{ x: 1440, opacity: [0, 1, 0] }}
                transition={{ duration: reducedMotion ? 0.1 : 0.65, ease: "easeInOut" }}
              />
            </g>
          )}
        </svg>
      </div>
    </motion.div>
  );
}
