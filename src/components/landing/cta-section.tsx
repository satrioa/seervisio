"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import useScreenSize from "@/hooks/use-screen-size"
import Gravity, { MatterBody } from "@/components/fancy/physics/cursor-attractor-and-gravity"

const PARTICLE_COUNT = 80

export function CtaSection() {
  const screenSize = useScreenSize()

  const maxSize = screenSize.lessThan("sm") ? 20 : screenSize.lessThan("md") ? 30 : 40
  const minSize = screenSize.lessThan("sm") ? 8 : 16

  const particles = React.useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const size = Math.max(minSize, Math.random() * maxSize)
        return { id: i, size, x: `${Math.random() * 100}%`, y: `${Math.random() * 100}%` }
      }),
    [minSize, maxSize],
  )

  return (
    <section className="relative overflow-hidden border-y border-border/40 py-24 sm:py-32">
      <Gravity
        attractorStrength={0.0}
        cursorStrength={0.0004}
        cursorFieldRadius={200}
        className="absolute inset-0 z-0"
        addTopWall={false}
      >
        {particles.map((p) => (
          <MatterBody
            key={p.id}
            matterBodyOptions={{ friction: 0.5, restitution: 0.2 }}
            bodyType="circle"
            x={p.x}
            y={p.y}
          >
            <div
              className="rounded-full bg-primary/10 dark:bg-primary/8"
              style={{ width: p.size, height: p.size }}
            />
          </MatterBody>
        ))}
      </Gravity>

      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
        >
          Ready to modernize your repair shop?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground"
        >
          Join thousands of repair shops already using Seervisio. Start free, no credit card required.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Button asChild size="lg" className="h-12 gap-2 px-8 text-base">
            <Link href="/signup">
              Start Free
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 gap-2 px-8 text-base">
            <Link href="mailto:support@seervisio.com?subject=Demo%20Request">
              <Calendar className="size-4" />
              Book Demo
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
