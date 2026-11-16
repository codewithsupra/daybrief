"use client";

import { useEffect, useRef, useState } from "react";

/** Adds `is-in` the first time the block scrolls into view, so its animation plays once, when seen. */
export function Reveal({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`${className} ${seen ? "is-in" : ""}`}>
      {children}
    </div>
  );
}
