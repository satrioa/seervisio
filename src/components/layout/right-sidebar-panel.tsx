"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRightSidebar } from "./right-sidebar-context";
import { ServiceSidebarOverview } from "@/components/services/service-sidebar-overview";
import { ServiceSidebarDetail } from "@/components/services/service-sidebar-detail";

export function RightSidebarPanel() {
  const { type, data } = useRightSidebar();

  return (
    <aside className="hidden h-screen w-[400px] min-w-[400px] overflow-y-auto border-l bg-background lg:sticky lg:top-0 lg:block">
      <AnimatePresence mode="wait">
        {type === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex h-full flex-col"
          >
            <ServiceSidebarOverview />
          </motion.div>
        )}
        {type === "detail" && data && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex h-full flex-col"
          >
            <ServiceSidebarDetail service={data} />
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
