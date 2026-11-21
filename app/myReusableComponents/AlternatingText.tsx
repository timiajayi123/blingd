"use client";

export default function AlternatingText({
  text,
  startWithBlack = true,
  className = "",
}: {
  text: string;
  startWithBlack?: boolean;
  className?: string;
}) {
  // Alternate colors for letters, skipping spaces so the pattern applies to visible chars
  const chars = Array.from(text);
  let count = 0;

  return (
    <span className={`inline-flex items-center ${className}`} aria-hidden>
      {chars.map((ch, i) => {
        if (ch === " ") {
          return (
            <span key={i} className="mx-[2px]" aria-hidden>
              {" "}
            </span>
          );
        }

        const useBlack = ((count % 2 === 0) === startWithBlack);
        count++;

        // Black letters: plain dark text with a tiny outline. White letters: plain white text with subtle outline + shadow for legibility.
        const commonOutline = { WebkitTextStroke: '0.5px rgba(0,0,0,0.18)', textShadow: '0 0 1px rgba(0,0,0,0.06)' } as React.CSSProperties;

        if (useBlack) {
          return (
            <span key={i} className="text-slate-900" style={commonOutline} aria-hidden>
              {ch}
            </span>
          );
        }

        return (
          <span
            key={i}
            className="text-white"
            style={{ ...commonOutline, textShadow: '0 1px 0 rgba(0,0,0,0.6)' }}
            aria-hidden
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
}
