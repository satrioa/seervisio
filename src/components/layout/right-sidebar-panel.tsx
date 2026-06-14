"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRightSidebar } from "./right-sidebar-context";
import { ServiceSidebarOverview } from "@/components/services/service-sidebar-overview";
import { ServiceSidebarDetail } from "@/components/services/service-sidebar-detail";

export function RightSidebarPanel() {
  const { type, data, onServiceUpdated } = useRightSidebar();
  const [viewSwitchKey, setViewSwitchKey] = React.useState(0);
  const [viewSwitchDirection, setViewSwitchDirection] = React.useState(1);

  React.useEffect(() => {
    const handleViewModeChange = (event: Event) => {
      const mode = (event as CustomEvent<{ mode?: string }>).detail?.mode;

      setViewSwitchDirection(mode === "kanban" ? 1 : -1);
      setViewSwitchKey((key) => key + 1);
    };

    window.addEventListener("seervis:services-view-mode-change", handleViewModeChange);

    return () => {
      window.removeEventListener("seervis:services-view-mode-change", handleViewModeChange);
    };
  }, []);

  const sidebarTransition = {
    duration: 0.28,
    ease: [0.22, 1, 0.36, 1] as const,
  };

  const sidebarVariants = {
    initial: (direction: number) => ({
      opacity: 0,
      x: direction > 0 ? 28 : -28,
      filter: "blur(5px)",
    }),
    animate: {
      opacity: 1,
      x: 0,
      filter: "blur(0px)",
    },
    exit: (direction: number) => ({
      opacity: 0,
      x: direction > 0 ? -20 : 20,
      filter: "blur(5px)",
    }),
  };

  return (
    <aside className="hidden h-screen w-[400px] min-w-[400px] overflow-y-auto overflow-x-hidden border-l bg-background lg:sticky lg:top-0 lg:block">
      <AnimatePresence mode="wait" custom={viewSwitchDirection}>
        {type === "overview" && (
          <motion.div
            key={`overview-${viewSwitchKey}`}
            custom={viewSwitchDirection}
            variants={sidebarVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={sidebarTransition}
            className="flex h-full flex-col"
          >
            <ServiceSidebarOverview />
          </motion.div>
        )}
        {type === "detail" && data && (
          <motion.div
            key={`detail-${data.id}-${viewSwitchKey}`}
            custom={viewSwitchDirection}
            variants={sidebarVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={sidebarTransition}
            className="flex h-full flex-col"
          >
            <ServiceSidebarDetail service={data} onServiceUpdated={onServiceUpdated} />
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
