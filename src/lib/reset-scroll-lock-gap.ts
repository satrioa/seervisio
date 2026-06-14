"use client"

function resetScrollLockGap() {
  if (typeof document === "undefined") return

  document.documentElement.style.setProperty("--removed-body-scroll-bar-size", "0px")
  document.body.style.setProperty("--removed-body-scroll-bar-size", "0px")
  document.documentElement.style.marginRight = "0px"
  document.documentElement.style.paddingRight = "0px"
  document.body.style.marginRight = "0px"
  document.body.style.paddingRight = "0px"
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
