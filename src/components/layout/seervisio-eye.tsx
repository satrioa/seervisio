"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useId,
} from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  animate,
  useAnimationFrame,
  useReducedMotion,
} from "framer-motion";

/* ─── Types ─────────────────────────────────── */

export type EyeState =
  | "idle"
  | "thinking"
  | "processing"
  | "success"
  | "error"
  | "notification"
  | "sleep";

export interface SeervisioEyeProps {
  /** External state control. Transient states (success/error/notification) auto-recover to idle. */
  state?: EyeState;
  /** Direction for the notification state gaze. */
  notificationDirection?: "left" | "right";
  className?: string;
  /** Uniform scale factor (default 1). */
  size?: number;
}

/* ─── Geometry ──────────────────────────────── */

const EYE_W = 28;
const EYE_H = 18;
const EYE_RX = 9;
const GAP = 10;
const PAD = 2;

const VB_W = EYE_W * 2 + GAP + PAD * 2; // 70
const VB_H = EYE_H + PAD * 2; // 22

const PUPIL_W = 7;
const PUPIL_H = 7;
const PUPIL_RX = 3.5;

/* Eye positions */
const L_EYE_X = PAD;
const L_EYE_Y = PAD;
const L_CX = L_EYE_X + EYE_W / 2; // 16
const L_CY = L_EYE_Y + EYE_H / 2; // 11

const R_EYE_X = PAD + EYE_W + GAP;
const R_EYE_Y = L_EYE_Y;
const R_CX = R_EYE_X + EYE_W / 2;
const R_CY = L_CY;

/* Pupil default positions (centered within each eye) */
const PUPIL_OFF = (EYE_W - PUPIL_W) / 2; // 10.5
const L_PUPIL_X = L_EYE_X + PUPIL_OFF;
const L_PUPIL_Y = L_EYE_Y + (EYE_H - PUPIL_H) / 2;
const R_PUPIL_X = R_EYE_X + PUPIL_OFF;
const R_PUPIL_Y = L_PUPIL_Y;

/* ─── Gaze limits ──────────────────────────── */

const MAX_GX = 3.5;
const MAX_GY = 2;
const MICRO_X_AMP = 0.35;
const MICRO_Y_AMP = 0.25;

/* ─── Blink timing ─────────────────────────── */

const BLINK_MIN_MS = 3000;
const BLINK_MAX_MS = 6000;
const BLINK_DUR = 0.12;
const DOUBLE_BTN_CHANCE = 0.15;

/* ─── Spring configs ────────────────────────── */

const gazeSpring = { stiffness: 90, damping: 15, mass: 0.6 };
const exprSpring = { stiffness: 220, damping: 22 };
const pupilSpring = { stiffness: 110, damping: 14, mass: 0.5 };

/* ─── Helpers ────────────────────────────────── */

function rng(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* ─── Component ─────────────────────────────── */

export function SeervisioEye({
  state: externalState = "idle",
  notificationDirection = "left",
  className,
  size = 1,
}: SeervisioEyeProps) {
  const rid = useId().replace(/[:$]/g, "");
  const prefersReduced = useReducedMotion();

  /* ── State with auto-recovery ── */
  const [currentState, setCurrentState] = useState<EyeState>("idle");
  const stateRef = useRef<EyeState>("idle");
  const recoveryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (recoveryTimer.current) clearTimeout(recoveryTimer.current);
    stateRef.current = externalState;
    setCurrentState(externalState);

    const recoveryMs =
      externalState === "success" ? 1500
      : externalState === "error" ? 1200
      : externalState === "notification" ? 2000
      : null;

    if (recoveryMs !== null) {
      recoveryTimer.current = setTimeout(() => {
        if (stateRef.current === externalState) {
          setCurrentState("idle");
        }
      }, recoveryMs);
    }

    return () => {
      if (recoveryTimer.current) clearTimeout(recoveryTimer.current);
    };
  }, [externalState]);

  /* ── Gaze (cursor following) ── */
  const rawGx = useMotionValue(0);
  const rawGy = useMotionValue(0);
  const smoothGx = useSpring(rawGx, gazeSpring);
  const smoothGy = useSpring(rawGy, gazeSpring);

  useEffect(() => {
    if (currentState === "sleep" || prefersReduced) return;

    const onMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      rawGx.set(nx * MAX_GX);
      rawGy.set(ny * MAX_GY);
    };

    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [currentState, prefersReduced, rawGx, rawGy]);

  /* ── Micro movements (idle / continuous) ── */
  const microX = useMotionValue(0);
  const microY = useMotionValue(0);

  useAnimationFrame((t) => {
    if (prefersReduced || currentState === "sleep") {
      microX.set(0);
      microY.set(0);
      return;
    }
    const s = t * 0.001;
    microX.set(Math.sin(s * 0.55) * MICRO_X_AMP);
    microY.set(Math.sin(s * 0.37 + 1.3) * MICRO_Y_AMP);
  });

  /* ── Breathing oscillation ── */
  const breath = useMotionValue(1);

  useAnimationFrame((t) => {
    if (prefersReduced || currentState === "sleep") {
      breath.set(1);
      return;
    }
    breath.set(1 + Math.sin(t * 0.001 * 0.22) * 0.005);
  });

  /* ── Thinking: slow pupil drift ── */
  const thinkDrift = useMotionValue(0);

  useAnimationFrame((t) => {
    if (currentState !== "thinking" || prefersReduced) {
      thinkDrift.set(0);
      return;
    }
    thinkDrift.set(Math.sin(t * 0.001 * 1.0) * 2);
  });

  /* ── Blink ── */
  const blinkScale = useMotionValue(1);
  const blinking = useRef(false);
  const blinkScheduler = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doBlinkRef = useRef<(() => Promise<void>) | null>(null);

  const doBlink = useCallback(async () => {
    if (blinking.current || prefersReduced) return;
    blinking.current = true;

    await animate(blinkScale, 0.03, {
      duration: BLINK_DUR * 0.4,
      ease: "easeIn",
    });
    await animate(blinkScale, 1.12, {
      duration: BLINK_DUR * 0.35,
      ease: "easeOut",
    });
    await animate(blinkScale, 1, {
      duration: BLINK_DUR * 0.25,
      ease: "easeOut",
    });

    blinking.current = false;

    const delay = rng(BLINK_MIN_MS, BLINK_MAX_MS);
    blinkScheduler.current = setTimeout(() => {
      if (Math.random() < DOUBLE_BTN_CHANCE) {
        doBlinkRef.current?.().then(() =>
          setTimeout(() => doBlinkRef.current?.(), 180),
        );
      } else {
        doBlinkRef.current?.();
      }
    }, delay);
  }, [prefersReduced, blinkScale]);

  doBlinkRef.current = doBlink;

  useEffect(() => {
    if (prefersReduced) return;
    blinkScheduler.current = setTimeout(
      () => doBlinkRef.current?.(),
      rng(BLINK_MIN_MS, BLINK_MAX_MS),
    );
    return () => {
      if (blinkScheduler.current) clearTimeout(blinkScheduler.current);
    };
  }, [prefersReduced]);

  /* ── Expression transforms ── */
  const narrowL = useMotionValue(1);
  const narrowR = useMotionValue(1);
  const tiltL = useMotionValue(0);
  const tiltR = useMotionValue(0);

  useEffect(() => {
    const d = prefersReduced ? 0.01 : 0.45;
    const fast = prefersReduced ? 0.01 : 0.25;

    switch (currentState) {
      case "thinking":
        animate(narrowL, 0.82, { duration: d });
        animate(narrowR, 0.82, { duration: d });
        animate(tiltL, 0, { duration: d });
        animate(tiltR, 0, { duration: d });
        break;

      case "processing":
        animate(narrowL, 0.88, { duration: d });
        animate(narrowR, 0.88, { duration: d });
        animate(tiltL, 0, { duration: d });
        animate(tiltR, 0, { duration: d });
        break;

      case "success":
        animate(narrowL, 0.72, { duration: fast });
        animate(narrowR, 0.72, { duration: fast });
        animate(tiltL, -2.5, { duration: fast });
        animate(tiltR, 2.5, { duration: fast });
        break;

      case "error":
        animate(narrowL, 0.65, { duration: 0.2 });
        animate(narrowR, 0.65, { duration: 0.2 });
        animate(tiltL, 3.5, { duration: 0.2 });
        animate(tiltR, -3.5, { duration: 0.2 });
        if (!prefersReduced) doBlink();
        break;

      case "notification":
        animate(narrowL, 1.18, { duration: fast });
        animate(narrowR, 1.18, { duration: fast });
        animate(tiltL, 0, { duration: fast });
        animate(tiltR, 0, { duration: fast });
        rawGx.set(notificationDirection === "left" ? -MAX_GX * 0.7 : MAX_GX * 0.7);
        rawGy.set(0);
        break;

      case "sleep":
        animate(narrowL, 0, { duration: 1.2, ease: "easeInOut" });
        animate(narrowR, 0, { duration: 1.2, ease: "easeInOut" });
        animate(tiltL, 0, { duration: 0.5 });
        animate(tiltR, 0, { duration: 0.5 });
        rawGx.set(0);
        rawGy.set(0);
        break;

      default:
        animate(narrowL, 1, { duration: d });
        animate(narrowR, 1, { duration: d });
        animate(tiltL, 0, { duration: d });
        animate(tiltR, 0, { duration: d });
    }
  }, [
    currentState,
    prefersReduced,
    narrowL,
    narrowR,
    tiltL,
    tiltR,
    rawGx,
    rawGy,
    notificationDirection,
    doBlink,
  ]);

  /* ── Wake from sleep ── */
  useEffect(() => {
    if (currentState !== "sleep") return;
    const onMove = () => setCurrentState("idle");
    window.addEventListener("mousemove", onMove, { once: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [currentState]);

  /* ── Combined pupil offset (gaze + micro + thinking) ── */
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spx = useSpring(px, pupilSpring);
  const spy = useSpring(py, pupilSpring);

  useAnimationFrame(() => {
    px.set(
      smoothGx.get() +
        microX.get() +
        (currentState === "thinking" ? thinkDrift.get() : 0),
    );
    py.set(smoothGy.get() + microY.get());
  });

  /* ── Clip-path IDs ── */
  const cl = `seervisio-${rid}-l`;
  const cr = `seervisio-${rid}-r`;

  /* ── Spring-wrapped expression values for smooth transitions ── */
  const sNL = useSpring(narrowL, exprSpring);
  const sNR = useSpring(narrowR, exprSpring);
  const sTL = useSpring(tiltL, exprSpring);
  const sTR = useSpring(tiltR, exprSpring);

  const s = size;

  return (
    <motion.svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className={className}
      width={VB_W * s}
      height={VB_H * s}
      style={{ overflow: "visible", display: "block" }}
      aria-label={
        currentState === "sleep" ? "AI assistant — sleeping" : "AI assistant"
      }
      role="img"
    >
      <defs>
        <clipPath id={cl}>
          <rect x={L_EYE_X} y={L_EYE_Y} width={EYE_W} height={EYE_H} rx={EYE_RX} />
        </clipPath>
        <clipPath id={cr}>
          <rect x={R_EYE_X} y={R_EYE_Y} width={EYE_W} height={EYE_H} rx={EYE_RX} />
        </clipPath>
      </defs>

      {/* ── Left eye ── */}
      <motion.g
        style={{
          scaleY: blinkScale,
          originX: L_CX,
          originY: L_CY,
        }}
      >
        <motion.g
          style={{
            scaleY: sNL,
            rotate: sTL,
            originX: L_CX,
            originY: L_CY,
          }}
        >
          {/* Eye white */}
          <rect
            x={L_EYE_X}
            y={L_EYE_Y}
            width={EYE_W}
            height={EYE_H}
            rx={EYE_RX}
            fill="white"
          />
          {/* Pupil */}
          <g clipPath={`url(#${cl})`}>
            <motion.g style={{ x: spx, y: spy }}>
              <rect
                x={L_PUPIL_X}
                y={L_PUPIL_Y}
                width={PUPIL_W}
                height={PUPIL_H}
                rx={PUPIL_RX}
                fill="#0d0d1a"
              />
            </motion.g>
          </g>
        </motion.g>
      </motion.g>

      {/* ── Right eye ── */}
      <motion.g
        style={{
          scaleY: blinkScale,
          originX: R_CX,
          originY: R_CY,
        }}
      >
        <motion.g
          style={{
            scaleY: sNR,
            rotate: sTR,
            originX: R_CX,
            originY: R_CY,
          }}
        >
          <rect
            x={R_EYE_X}
            y={R_EYE_Y}
            width={EYE_W}
            height={EYE_H}
            rx={EYE_RX}
            fill="white"
          />
          <g clipPath={`url(#${cr})`}>
            <motion.g style={{ x: spx, y: spy }}>
              <rect
                x={R_PUPIL_X}
                y={R_PUPIL_Y}
                width={PUPIL_W}
                height={PUPIL_H}
                rx={PUPIL_RX}
                fill="#0d0d1a"
              />
            </motion.g>
          </g>
        </motion.g>
      </motion.g>
    </motion.svg>
  );
}
