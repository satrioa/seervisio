"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

export interface BootTask {
  id: string;
  label: string;
  action: () => Promise<void>;
}

export interface TaskLogItem {
  id: string;
  label: string;
  status: "active" | "completed";
}

type Phase = "loading" | "extending" | "ready";

interface BootContextValue {
  displayProgress: number;
  taskLog: TaskLogItem[];
  phase: Phase;
  brandColor: string;
  start: (tasks: BootTask[]) => Promise<void>;
  setBrandColor: (color: string) => void;
}

const BootContext = createContext<BootContextValue | null>(null);

const TICK_MS = 30;
const PAUSE_MS = 250;
const EXIT_MS = 750;

export function useBootLoader() {
  const ctx = useContext(BootContext);
  if (!ctx) throw new Error("useBootLoader must be used within BootProvider");
  return ctx;
}

export function BootProvider({ children }: { children: ReactNode }) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [taskLog, setTaskLog] = useState<TaskLogItem[]>([]);
  const [phase, setPhase] = useState<Phase>("loading");
  const [brandColor, setBrandColor] = useState("");

  const progressRef = useRef(0);
  const displayRef = useRef(0);
  const isBootingRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logIdCounter = useRef(1000);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const start = useCallback(async (tasks: BootTask[]) => {
    if (isBootingRef.current) return;
    isBootingRef.current = true;

    setDisplayProgress(0);
    setTaskLog([]);
    displayRef.current = 0;
    progressRef.current = 0;

    const total = tasks.length;
    let completed = 0;

    tickRef.current = setInterval(() => {
      const real = progressRef.current;
      const maxAllowed =
        real >= 100 ? 99 : Math.min(Math.floor(real), 99);

      setDisplayProgress((prev) => {
        if (prev >= 99) return 99;
        const next = Math.min(prev + 1, maxAllowed);
        displayRef.current = next;
        return next;
      });
    }, TICK_MS);

    for (const task of tasks) {
      if (!isBootingRef.current) break;

      const entryId = `boot-${++logIdCounter.current}`;
      setTaskLog((prev) => [...prev, { id: entryId, label: task.label, status: "active" }]);

      try {
        await task.action();
      } catch {
        // Non-critical
      }

      setTaskLog((prev) =>
        prev.map((t) => (t.id === entryId ? { ...t, status: "completed" as const } : t)),
      );

      completed++;
      progressRef.current = (completed / total) * 100;
    }

    setPhase("extending");
    progressRef.current = 100;

    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (displayRef.current >= 99) {
          clearInterval(check);
          resolve();
        }
      }, 10);
    });

    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }

    const readyId = `boot-${++logIdCounter.current}`;
    setTaskLog((prev) => [...prev, { id: readyId, label: "Ready", status: "completed" }]);
    setDisplayProgress(99);
    await new Promise((r) => setTimeout(r, PAUSE_MS));

    setPhase("ready");
    await new Promise((r) => setTimeout(r, EXIT_MS));

    isBootingRef.current = false;
  }, []);

  return (
    <BootContext.Provider
      value={{
        displayProgress,
        taskLog,
        phase,
        brandColor,
        start,
        setBrandColor,
      }}
    >
      {children}
    </BootContext.Provider>
  );
}
