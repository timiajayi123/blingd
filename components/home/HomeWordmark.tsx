"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const INTRO = "BOSSY";
const BRAND = "BLiNG'D";

export default function HomeWordmark() {
  const [text, setText] = useState("");
  const [stage, setStage] = useState<"waiting" | "intro" | "erase" | "brand" | "complete">("waiting");
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const start = () => setStage("intro");
    if (document.documentElement.classList.contains("site-ready")) start();
    window.addEventListener("site-ready", start, { once: true });
    return () => window.removeEventListener("site-ready", start);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof window.setTimeout>;

    if (stage === "intro") {
      if (text.length < INTRO.length) {
        timer = window.setTimeout(() => setText(INTRO.slice(0, text.length + 1)), 115);
      } else {
        timer = window.setTimeout(() => setStage("erase"), 360);
      }
    }

    if (stage === "erase") {
      if (text.length > 1) {
        timer = window.setTimeout(() => setText((current) => current.slice(0, -1)), 190);
      } else {
        timer = window.setTimeout(() => setStage("brand"), 180);
      }
    }

    if (stage === "brand") {
      if (text.length < BRAND.length) {
        timer = window.setTimeout(() => setText(BRAND.slice(0, text.length + 1)), 105);
      } else {
        timer = window.setTimeout(() => setStage("complete"), 180);
      }
    }

    return () => window.clearTimeout(timer);
  }, [stage, text]);

  return (
    <div className="home-wordmark-lockup">
      <span className="home-wordmark-be" aria-label="Be">
        {"Be".split("").map((char, index) => (
          <motion.span
            key={index}
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={prefersReducedMotion ? {
              opacity: 1, scale: 1, y: 0, rotate: 0,
            } : {
              opacity: 1,
              scale: [1, 1.08, 1],
              y: [0, -6, 0],
              rotate: [-1.5, 1.5, -1.5],
            }}
            transition={{
              opacity: { duration: 0.4, delay: 0.1 + index * 0.1 },
              scale: { duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: index * 0.1 },
              y: { duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: index * 0.1 },
              rotate: { duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: index * 0.1 },
            }}
            className="inline-block"
            style={{ transformOrigin: "50% 100%" }}
            aria-hidden="true"
          >
            {char}
          </motion.span>
        ))}
      </span>
      <h1
        className={`home-brand-wordmark ${stage === "complete" ? "is-flipping" : ""}`}
        aria-label={stage === "complete" ? "BLING'D" : text}
      >
        {text.split("").map((letter, index) => (
          <span
            key={`${letter}-${index}`}
            className={stage === "complete" && letter === "i" ? "home-brand-wordmark__inverted-i" : undefined}
          >
            {letter}
          </span>
        ))}
        {stage !== "complete" && <span className="home-wordmark-caret" aria-hidden="true">|</span>}
      </h1>
    </div>
  );
}
