import React from "react";
import { formatCurrencyIDR } from "@/lib/utils/money";

interface MoneyTextProps {
  value: number | string | null | undefined;
  className?: string;
}

export function MoneyText({ value, className }: MoneyTextProps) {
  return <span className={className}>{formatCurrencyIDR(value)}</span>;
}
