"use client";

function AmbientEyes() {
  return (
    <span
      aria-hidden="true"
      className="relative inline-flex items-center justify-center"
      style={{ gap: 8, height: 32 }}
    >
      {Array.from({ length: 2 }, (_, i) => (
        <span
          key={i}
          className="relative inline-block overflow-hidden rounded-full"
          style={{
            width: 64,
            height: 38,
            backgroundColor: "color-mix(in srgb, #f0f3f2 15%, transparent)",
            animation: `ambient-eyes-blink 7s infinite`,
          }}
        >
          <span
            className="absolute rounded-sm"
            style={{
              width: 20,
              height: 14,
              backgroundColor: "currentColor",
              top: "50%",
              left: "50%",
              marginLeft: -10,
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
          75%, 90% { transform: translate(0, 4px); }
          93%, 100% { transform: translate(0, 0); }
        }
        @keyframes ambient-eyes-blink {
          0%, 10%, 12%, 22%, 24%, 42%, 44%, 60%, 62%, 72%, 74%, 92%, 94%, 100% { height: 28px; }
          11%, 23%, 43%, 61%, 73%, 93% { height: 6px; }
        }
      `}</style>
    </span>
  );
}

export { AmbientEyes };
