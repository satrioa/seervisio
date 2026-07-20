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
      className="relative inline-flex items-center justify-center"
      style={{ gap: 10, height: 34 }}
    >
      {Array.from({ length: 2 }, (_, i) => (
        <span
          key={i}
          className="relative inline-block overflow-hidden rounded-[40%]"
          style={{
            width: 66,
            height: 40,
            backgroundColor: "#262626",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow:
              "inset 0 0 8px rgba(0,0,0,0.9), 0 0 10px rgba(80,220,160,0.10)",
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
            className="absolute rounded-full"
            style={{
              width: 18,
              height: 18,
              background:
                "radial-gradient(circle at 35% 30%, #aeffd8 0%, #34d399 45%, #059669 100%)",
              boxShadow:
                "0 0 8px #34d399, 0 0 16px rgba(52,211,153,0.6), inset 0 0 4px rgba(0,0,0,0.4)",
              top: "50%",
              left: "50%",
              marginLeft: -9,
              marginTop: -9,
              animation: `ambient-pupil-move 7s infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        </span>
      ))}
      <style>{`
        @keyframes ambient-pupil-move {
          0%, 12% { transform: translate(0, 0); }
          15%, 42% { transform: translate(-5px, 0); }
          45%, 72% { transform: translate(5px, 0); }
          75%, 90% { transform: translate(0, 5px); }
          93%, 100% { transform: translate(0, 0); }
        }
        @keyframes ambient-eyes-blink {
          0%, 10%, 12%, 22%, 24%, 42%, 44%, 60%, 62%, 72%, 74%, 92%, 94%, 100% { height: 40px; }
          11%, 23%, 43%, 61%, 73%, 93% { height: 6px; }
        }
      `}</style>
    </span>
  );
}

export { AmbientEyes };

export default AmbientEyes;
