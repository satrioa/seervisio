// @ts-nocheck
// WIP POS module.
"use client";

import * as React from "react";
import { usePosCart } from "./pos-cart-context";
import { CartPanel } from "./cart-panel";

export function PosCartSidebar() {
  const cartProps = usePosCart();
  if (!cartProps) return null;

  return (
    <aside className="hidden h-screen w-[400px] min-w-[400px] overflow-y-auto border-l bg-background lg:sticky lg:top-0 lg:block xl:w-[420px]">
      <CartPanel {...cartProps} />
    </aside>
  );
}
