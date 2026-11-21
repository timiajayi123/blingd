"use client";

import {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useMemo,
  useState,
} from "react";
import { getOriginalVideoUrl } from "@/lib/videoDelivery";

type OptimizedVideoProps = {
  src?: string | { src: string; type: string }[];
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  preload?: "auto" | "metadata" | "none";
  desktopOnly?: boolean;
  fallbackImage?: string;
  controls?: boolean;
  priority?: boolean;
};

const OptimizedVideo = forwardRef<HTMLVideoElement, OptimizedVideoProps>(
  (
    {
      src,
      poster,
      className,
      autoPlay = true,
      loop = true,
      muted = true,
      playsInline = true,
      preload = "metadata",
      desktopOnly = false,
      fallbackImage,
      controls = false,
      priority = true,
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isMobile, setIsMobile] = useState<boolean | null>(desktopOnly ? null : false);
    const [isVisible, setIsVisible] = useState(priority);

    useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement);

    // Normalize sources
    const sources = useMemo(() => {
      if (Array.isArray(src)) return src.map((source) => ({ ...source, src: getOriginalVideoUrl(source.src) }));
      if (src) {
        return [
          {
            src: getOriginalVideoUrl(src),
            type: (() => {
              try {
                return new URL(src, "https://example.com").pathname.toLowerCase().endsWith(".webm")
                  ? "video/webm"
                  : "video/mp4";
              } catch {
                return src.toLowerCase().includes(".webm") ? "video/webm" : "video/mp4";
              }
            })(),
          },
        ];
      }
      return [];
    }, [src]);

    // Mobile detection (safe)
    useEffect(() => {
      const check = () => setIsMobile(window.innerWidth < 768);
      check();
      window.addEventListener("resize", check);
      return () => window.removeEventListener("resize", check);
    }, []);

    // SINGLE IntersectionObserver (no loops)
    useEffect(() => {
      if (priority || !videoRef.current) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        { threshold: 0.25 }
      );

      observer.observe(videoRef.current);

      return () => observer.disconnect();
    }, [priority]);

    // Stable play logic (fixes tab return + resume)
    const safePlay = useCallback(() => {
      const video = videoRef.current;
      if (!video) return;

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    }, []);

    // Handle visibility change (FIXES “stop when returning tab”)
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleVisibility = () => {
        if (document.visibilityState === "visible") {
          // small delay prevents flicker
          setTimeout(() => {
            safePlay();
          }, 150);
        }
      };

      document.addEventListener("visibilitychange", handleVisibility);

      return () => {
        document.removeEventListener("visibilitychange", handleVisibility);
      };
    }, [safePlay]);

    // Auto play once ready (ONLY ONCE)
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !isVisible) return;

      if (autoPlay) {
        safePlay();
      }
    }, [isVisible, autoPlay, safePlay]);

    // MOBILE / desktop skip
    if (desktopOnly && isMobile === null) {
      return (
        <div
          className={className}
          style={{
            backgroundImage: `url("${fallbackImage || poster || ""}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      );
    }

    if (desktopOnly && isMobile) {
      return (
        <div
          className={className}
          style={{
            backgroundImage: `url("${fallbackImage || poster || ""}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      );
    }

    return (
      <video
        ref={videoRef}
        className={`${className} bg-black`}
        autoPlay={autoPlay && isVisible}
        loop={loop}
        muted={muted}
        playsInline={playsInline}
        preload={isVisible ? preload : "none"}
        controls={controls}
        poster={poster}
      >
        {isVisible && sources.map((s, i) => (
          <source key={i} src={s.src} type={s.type} />
        ))}
      </video>
    );
  }
);

OptimizedVideo.displayName = "OptimizedVideo";

export default OptimizedVideo;
