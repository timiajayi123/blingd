"use client";

import { useEffect, useRef, useState } from "react";
import { User } from "lucide-react";

type Gender = "all" | "male" | "female" | "unisex";

export default function GenderSelect({
  value,
  onChange,
  id,
  className = "",
}: {
  value: Gender;
  onChange: (v: Gender) => void;
  id?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  const options: { label: string; value: Gender }[] = [
    { label: "All", value: "all" },
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
    { label: "Unisex", value: "unisex" },
  ];

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) setFocused(null);
  }, [open]);

  const toggle = () => setOpen((s) => !s);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setFocused((f) => (f === null ? 0 : Math.min(f + 1, options.length - 1)));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setFocused((f) => (f === null ? options.length - 1 : Math.max(f - 1, 0)));
    }
    if (e.key === "Enter" && focused !== null) {
      e.preventDefault();
      onChange(options[focused].value);
      setOpen(false);
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        className="flex items-center bg-slate-50 border border-slate-200 rounded-full px-3 py-1 shadow-sm transition-transform transform hover:-translate-y-0.5 hover:shadow-md focus:-translate-y-0.5 focus:shadow-md focus:outline-none"
      >
        <User className="w-4 h-4 text-slate-600 mr-2" />
        <span className="text-sm text-slate-700 capitalize">{options.find((o) => o.value === value)?.label || "All"}</span>
        <span className="pointer-events-none ml-3 text-xs text-slate-500">▾</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-activedescendant={focused !== null ? `gender-option-${focused}` : undefined}
          tabIndex={-1}
          className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50"
        >
          {options.map((opt, i) => (
            <li
              id={`gender-option-${i}`}
              role="option"
              aria-selected={value === opt.value}
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              onMouseEnter={() => setFocused(i)}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 ${
                focused === i ? "bg-slate-50" : ""
              } ${value === opt.value ? "font-medium" : ""}`}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
