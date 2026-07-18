"use client"

import { motion, type Transition } from "motion/react"
import * as React from "react"
import { cn } from "@/lib/utils"

export interface MagneticButtonProps extends React.ComponentPropsWithoutRef<typeof motion.button> {
  size?: "default" | "sm" | "lg" | "icon"
  variant?: "default" | "primary"
  transition?: Transition
}

const DEFAULT_TRANSITION: Transition = {
  type: "spring",
  stiffness: 150,
  damping: 15,
  mass: 0.1,
}

const sizeClasses = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-10 rounded-md px-8",
  icon: "h-9 w-9",
}

const variantClasses = {
  default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
  primary: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
}

export function MagneticButton({
  children,
  className,
  size = "default",
  variant = "default",
  transition = DEFAULT_TRANSITION,
  onMouseMove,
  onMouseLeave,
  ...props
}: MagneticButtonProps) {
  const ref = React.useRef<HTMLButtonElement>(null)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    onMouseMove?.(e)
    const node = ref.current
    if (!node) return
    const { clientX, clientY } = e
    const { height, width, left, top } = node.getBoundingClientRect()
    setPosition({
      x: clientX - (left + width / 2),
      y: clientY - (top + height / 2),
    })
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    onMouseLeave?.(e)
    setPosition({ x: 0, y: 0 })
  }

  return (
    <motion.button
      ref={ref}
      animate={{ x: position.x, y: position.y }}
      transition={transition}
      whileTap={{ scale: 0.95 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  )
}

export default MagneticButton
