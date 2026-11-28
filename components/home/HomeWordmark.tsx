"use client";

import { useEffect, useState } from "react";

const INTRO = "BOSSY";
const BRAND = "BLiNG'D";

export default function HomeWordmark() {
  const [text, setText] = useState("");
  const [stage, setStage] = useState<"waiting" | "intro" | "erase" | "brand" | "complete">("waiting");

  useEffect(() => {
    const start = () => setStage("intro");
    if (document.documentElement.classList.contains("site-ready")) start();
    window.addEventListener("site-ready", start, { once: true });
    return () => window.removeEventListener("site-ready", start);
  }, []);

  useEffect(() => {
    let timer: number | undefined;

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
