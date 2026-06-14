"use client";

import { HelpCircle, Laptop, Monitor, Smartphone, Tablet, Watch } from "lucide-react";
import type { DeviceIconKey } from "@/lib/services/service-status";

const DEVICE_ICON_MAP = {
  smartphone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  desktop: Monitor,
  watch: Watch,
  default: HelpCircle,
} as const;

interface ServiceDeviceIconProps {
  iconKey?: DeviceIconKey;
  className?: string;
}

export function ServiceDeviceIcon({ iconKey, className = "size-4" }: ServiceDeviceIconProps) {
  const Icon = DEVICE_ICON_MAP[iconKey ?? "default"] ?? DEVICE_ICON_MAP.default;
  return <Icon className={className} />;
}
