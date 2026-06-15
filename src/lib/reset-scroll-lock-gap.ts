"use client"

function resetScrollLockGap() {
  if (typeof document === "undefined") return

  document.documentElement.style.setProperty("--removed-body-scroll-bar-size", "0px", "important")
  document.body.style.setProperty("--removed-body-scroll-bar-size", "0px", "important")
  document.documentElement.style.setProperty("margin-right", "0px", "important")
  document.documentElement.style.setProperty("padding-right", "0px", "important")
  document.body.style.setProperty("margin-right", "0px", "important")
  document.body.style.setProperty("padding-right", "0px", "important")
}

export function scheduleScrollLockGapReset() {
  if (typeof window === "undefined") return

  resetScrollLockGap()
  window.requestAnimationFrame(resetScrollLockGap)
  window.setTimeout(resetScrollLockGap, 0)
  window.setTimeout(resetScrollLockGap, 50)
  window.setTimeout(resetScrollLockGap, 150)
  window.setTimeout(resetScrollLockGap, 300)
}
