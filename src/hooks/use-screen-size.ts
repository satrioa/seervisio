"use client"

import { useEffect, useState } from "react"

const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const

type Breakpoint = keyof typeof breakpoints

export default function useScreenSize() {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    setWidth(window.innerWidth)
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return {
    width,
    lessThan: (bp: Breakpoint) => width > 0 && width < breakpoints[bp],
    greaterThan: (bp: Breakpoint) => width >= breakpoints[bp],
  }
}
