"use client";

import * as React from "react";

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Deep base */}
      <div className="absolute inset-0 bg-[#0a0a0f]" />

      {/* Orb 1 - large, slow, top-left */}
      <div
        className="absolute -top-1/4 -left-1/4 h-[80vh] w-[80vh] animate-mesh-drift-1 rounded-full opacity-30"
        style={{
          background:
            "radial-gradient(circle at center, hsl(221 83% 53% / 0.35) 0%, transparent 70%)",
        }}
      />

      {/* Orb 2 - medium, top-right */}
      <div
        className="absolute -top-1/3 -right-1/4 h-[60vh] w-[60vh] animate-mesh-drift-2 rounded-full opacity-25"
        style={{
          background:
            "radial-gradient(circle at center, hsl(260 60% 55% / 0.3) 0%, transparent 70%)",
        }}
      />

      {/* Orb 3 - small, bottom-left */}
      <div
        className="absolute -bottom-1/4 -left-1/6 h-[50vh] w-[50vh] animate-mesh-drift-3 rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle at center, hsl(190 70% 45% / 0.25) 0%, transparent 70%)",
        }}
      />

      {/* Orb 4 - subtle, center-right */}
      <div
        className="absolute top-1/3 right-0 h-[40vh] w-[40vh] animate-mesh-drift-1 rounded-full opacity-15"
        style={{
          background:
            "radial-gradient(circle at center, hsl(280 50% 50% / 0.2) 0%, transparent 70%)",
        }}
      />

      {/* Subtle grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)]" />
    </div>
  );
}
