"use client";

import { useEffect, useRef } from "react";

export default function MobileDecor() {
  const blobRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Respect reduced motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const handlePointer = (e: PointerEvent | TouchEvent) => {
      let x = window.innerWidth / 2;
      let y = window.innerHeight / 4; // default slightly above center
      if ((e as TouchEvent).touches) {
        const t = (e as TouchEvent).touches[0];
        x = t.clientX; y = t.clientY;
      } else {
        const p = e as PointerEvent;
        x = p.clientX; y = p.clientY;
      }
      target.current.x = x;
      target.current.y = y - 40; // slight offset
    };

    const onScroll = () => {
      // parallax move blob a little on scroll
      const s = window.scrollY * 0.07; // subtle
      const el = blobRef.current;
      if (el) el.style.transform = `translate3d(${current.current.x}px, ${current.current.y - s}px, 0)`;
    };

    const tick = () => {
      // interpolate
      current.current.x += (target.current.x - current.current.x) * 0.12;
      current.current.y += (target.current.y - current.current.y) * 0.12;
      const el = blobRef.current;
      if (el) {
        el.style.transform = `translate3d(${current.current.x - 120}px, ${current.current.y - 120}px, 0)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    // Attach listeners
    document.addEventListener("pointermove", handlePointer, { passive: true });
    document.addEventListener("touchmove", handlePointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener("pointermove", handlePointer);
      document.removeEventListener("touchmove", handlePointer);
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="mobile-decor lg:hidden pointer-events-none" aria-hidden>
      <div ref={blobRef} className="decor-blob will-change-transform" />
      <div className="decor-blob small will-change-transform" />
    </div>
  );
}
