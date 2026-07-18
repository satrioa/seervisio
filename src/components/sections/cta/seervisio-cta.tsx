"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import Gravity, { MatterBody } from "@/components/fancy/physics/cursor-attractor-and-gravity";
import { CosmicButton } from "@/components/ui/cosmic-button";
import Glow from "@/components/ui/glow";
import { Section } from "@/components/ui/section";

const PARTICLE_COUNT = 20;

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function SeervisioCta() {
  const [mounted, setMounted] = useState(false);
  const isMobile = useMediaQuery("(max-width: 640px)");
  const count = isMobile ? 8 : PARTICLE_COUNT;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative">
      <Section className="group relative overflow-hidden">
        <div className="max-w-container relative z-10 mx-auto flex flex-col items-center gap-6 text-center sm:gap-8">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-[640px] text-3xl leading-tight font-semibold sm:text-5xl sm:leading-tight"
          >
            Siap Level Up toko servis mu?
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          >
            <CosmicButton href="/signup">
              Mulai Gratis
            </CosmicButton>
          </motion.div>
        </div>
        <div className="absolute top-0 left-0 h-full w-full translate-y-[1rem] opacity-80 transition-all duration-500 ease-in-out group-hover:translate-y-[-2rem] group-hover:opacity-100">
          <Glow variant="bottom" />
        </div>
      </Section>
      <Gravity
        attractorStrength={0.0}
        cursorStrength={0.0004}
        cursorFieldRadius={200}
        addTopWall={true}
        className="pointer-events-none z-0"
      >
        {mounted && Array.from({ length: count }).map((_, i) => {
          const size = randomBetween(4, 55);
          const isAccent = i % 3 === 0;
          const angle = (i / count) * 360;
          const rad = (angle * Math.PI) / 180;
          const distance = 120;
          const tx = Math.cos(rad) * distance;
          const ty = Math.sin(rad) * distance;
          return (
            <MatterBody
              key={i}
              x={`${randomBetween(5, 95)}%`}
              y={`${randomBetween(10, 90)}%`}
              matterBodyOptions={{
                friction: 0.1,
                restitution: 0.2,
                density: 0.0015,
              }}
            >
              <motion.div
                initial={{ opacity: 0, x: tx, y: ty }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.003, ease: "easeOut" }}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: size,
                    height: size,
                    background: isAccent
                      ? "hsl(var(--primary) / 0.25)"
                      : "hsl(var(--foreground) / 0.08)",
                    border: isAccent
                      ? "1px solid hsl(var(--primary) / 0.15)"
                      : "1px solid hsl(var(--foreground) / 0.04)",
                  }}
                />
              </motion.div>
            </MatterBody>
          );
        })}
      </Gravity>
    </div>
  );
}
