"use client";

import * as React from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";

interface ScrambleTextProps {
  text: string;
  /** ms before the scramble starts resolving */
  delay?: number;
  /** per-character resolve speed */
  speed?: number;
  className?: string;
  as?: "span" | "div" | "h1";
  onDone?: () => void;
}

/**
 * Scramble/decode text effect — characters flicker through random
 * glyphs before settling on the target string. Used for the loading
 * brand reveal: "Loading..." → "S3erv1s10" → "Seervisio".
 */
export function ScrambleText({
  text,
  delay = 0,
  speed = 28,
  className,
  as = "span",
  onDone,
}: ScrambleTextProps) {
  const [display, setDisplay] = React.useState(text);
  const frame = React.useRef<number>(0);
  const start = React.useRef<number>(0);

  React.useEffect(() => {
    let raf = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const target = text;
    const total = target.length;

    const tick = (t: number) => {
      if (!start.current) start.current = t;
      const elapsed = t - start.current;
      if (elapsed < delay) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(1, (elapsed - delay) / (total * speed + 200));
      const revealed = Math.floor(progress * total);
      let out = "";
      for (let i = 0; i < total; i++) {
        if (i < revealed || target[i] === " ") {
          out += target[i];
        } else {
          out += CHARS[Math.floor(Math.random() * CHARS.length)];
        }
      }
      setDisplay(out);
      if (revealed < total) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplay(target);
        onDone?.();
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (timeout) clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, delay, speed]);

  const Tag = as as any;
  return <Tag className={className}>{display}</Tag>;
}

export default ScrambleText;
