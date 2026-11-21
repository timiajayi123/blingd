"use client";

import React, { useEffect, useRef } from "react";

type Props = {
  items: any[];
  renderItem: (p: any, idx: number) => React.ReactNode;
  speed?: number; // pixels per second
  itemWidth?: number | string;
  gap?: number;
  className?: string;
};

export default function ContinuousScroller({ items, renderItem, speed = 32, itemWidth = 160, gap = 16, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    // helper: snap to nearest child (used after user stops scrolling)
    const snapToNearest = () => {
      if (!container || !inner) return;
      const children = Array.from(inner.children) as HTMLElement[];
      if (!children.length) return;
      const scrollLeft = container.scrollLeft;
      const center = scrollLeft + container.clientWidth / 2;
      let best = children[0];
      let bestDiff = Math.abs(center - (children[0].offsetLeft + children[0].offsetWidth / 2));
      for (let i = 1; i < children.length; i++) {
        const c = children[i];
        const cCenter = c.offsetLeft + c.offsetWidth / 2;
        const diff = Math.abs(center - cCenter);
        if (diff < bestDiff) {
          best = c;
          bestDiff = diff;
        }
      }
      // Scroll so the chosen item is nicely aligned; a small negative offset yields a subtle peek
      container.scrollTo({ left: Math.max(0, best.offsetLeft - Math.min(12, Math.round(container.clientWidth * 0.03))), behavior: 'smooth' });
    };

    let rafId = 0;
    let last = performance.now();
    let paused = false;
    let finished = false; // when true, stop auto-scrolling permanently
    let snapTimer: number | undefined;

    // iOS has stronger momentum; allow longer debounce there
    const isIOS = typeof navigator !== 'undefined' && (/iP(ad|hone|od)/.test(navigator.platform) || (/Mac|iPhone|iPad|iPod/.test(navigator.userAgent) && 'ontouchend' in document));
    const DEFAULT_SNAP_DELAY = isIOS ? 300 : 220;

    const scheduleSnap = (delay = DEFAULT_SNAP_DELAY) => {
      if (typeof snapTimer !== 'undefined') window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(() => {
        snapTimer = undefined;
        snapToNearest();
      }, delay);
    };

    const onPause = () => { paused = true; if (typeof snapTimer !== 'undefined') { window.clearTimeout(snapTimer); snapTimer = undefined; } };
    const onResume = () => { if (!finished) paused = false; };

    const onScroll = () => {
      // schedule a snap shortly after user stops scrolling; length depends on platform
      if (!paused) scheduleSnap();
    };

    const frame = (now: number) => {
      if (!container || !inner) return;
      const dt = now - last;
      last = now;

      // Auto-scroll only on mobile; snapping works on both
      const maxScrollLeft = inner.scrollWidth - container.clientWidth;
      if (isMobile && !paused && !finished && inner.scrollWidth > container.clientWidth + 1) {
        const delta = (speed * dt) / 1000;
        container.scrollLeft = Math.min(container.scrollLeft + delta, maxScrollLeft);
        // If we've reached (or exceeded) the end, mark finished and stop further auto-advance
        if (container.scrollLeft >= maxScrollLeft - 1) {
          finished = true;
          paused = true; // ensure it's paused and won't resume
          scheduleSnap(120);
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);

    // Debounced user interaction handlers
    const onPointerDown = () => onPause();
    const onPointerUp = () => { scheduleSnap(120); onResume(); };
    const onTouchStart = () => onPause();
    const onTouchEnd = () => { scheduleSnap(120); onResume(); };

    container.addEventListener("pointerenter", onPause);
    container.addEventListener("pointerleave", onResume);
    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchend", onTouchEnd);
    container.addEventListener('scroll', onScroll, { passive: true });

    // When resizing/orientation changes, reset scrollLeft to 0 to avoid visual glitches and reset finished
    const onResize = () => {
      if (container) {
        container.scrollLeft = 0;
        finished = false;
        paused = false;
        if (typeof snapTimer !== 'undefined') { window.clearTimeout(snapTimer); snapTimer = undefined; }
      }
    };
    window.addEventListener("orientationchange", onResize);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      container.removeEventListener("pointerenter", onPause);
      container.removeEventListener("pointerleave", onResume);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener('scroll', onScroll);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("resize", onResize);
      if (typeof snapTimer !== 'undefined') { window.clearTimeout(snapTimer); snapTimer = undefined; }
    };
  }, [items, speed]);

  // Render a single pass of items — we will stop at the end rather than looping
  return (
    <div ref={containerRef} className={`overflow-x-auto hide-scrollbar ${className}`} style={{ WebkitOverflowScrolling: "touch", scrollSnapType: 'x proximity', paddingLeft: `${gap}px`, paddingRight: `${gap}px` }}>
      <div ref={innerRef} className="flex items-start" style={{ gap: `${gap}px`, minWidth: "max-content" }}>
        {items.map((p, i) => (
          <div key={(p && p.$id) ? `${p.$id}-${i}` : `idx-${i}`} className="flex-shrink-0" style={{ minWidth: typeof itemWidth === "number" ? `${itemWidth}px` : itemWidth, scrollSnapAlign: 'start' }}>
            {renderItem(p, i)}
          </div>
        ))}
      </div>
    </div>
  );
}
