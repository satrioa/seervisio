"use client";

/**
 * AmbientEyes — a retro OLED / premium-LED pair of eyes that blink and
 * wander. Polished with a subtle dither texture and glowing pupils.
 *
 * Improvements (per design spec):
 *  - Dither effect overlay
 *  - Retro OLED dark appearance with premium LED glow
 *  - Keeps blink animation
 *  - Keeps wandering (pupil) animation
 */
function AmbientEyes() {
  return (
    <span
      aria-hidden="true"
      className="relative inline-flex items-center justify-center overflow-hidden"
      style={{ gap: 8, height: 16 }}
    >
      {Array.from({ length: 2 }, (_, i) => (
        <span
          key={i}
          className="relative inline-block overflow-hidden rounded-[40%]"
          style={{
            width: 30,
            height: 14,
            backgroundColor: "#262626",
            animation: `ambient-eyes-blink 7s infinite`,
            animationDelay: `${i * 0.3}s`,
          }}
        >
          {/* dither texture */}
          <span
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(circle at center, rgba(255,255,255,0.5) 0.5px, transparent 0.6px)",
              backgroundSize: "3px 3px",
            }}
          />
          {/* LED pupil */}
          <span
            className="absolute rounded-xs"
            style={{
              width: 16,
              height: 14,
              background:
                "radial-gradient(circle at 35% 30%, #aeffd8 0%, #34d399 45%, #059669 100%)",
              boxShadow:
                "0 0 4px #34d399, 0 0 16px rgba(52,211,153,0.6), inset 0 0 4px rgba(0,0,0,0.4)",
              top: "50%",
              left: "50%",
              marginLeft: -8,
              marginTop: -7,
              animation: `ambient-pupil-move 7s infinite`,
            }}
          />
        </span>
      ))}
      <style>{`
        @keyframes ambient-pupil-move {
          0%, 12% { transform: translate(0, 0); }
          15%, 42% { transform: translate(-4px, 0); }
          45%, 72% { transform: translate(4px, 0); }
          75%, 90% { transform: translate(0, 3px); }
          93%, 100% { transform: translate(0, 0); }
        }
        @keyframes ambient-eyes-blink {
          0%, 10%, 12%, 22%, 24%, 42%, 44%, 60%, 62%, 72%, 74%, 92%, 94%, 100% { height: 14px; }
          11%, 23%, 43%, 61%, 73%, 93% { height: 5px; }
        }
      `}</style>
    </span>
  );
}

export { AmbientEyes };

export default AmbientEyes;
