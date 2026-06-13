// @ts-nocheck
// WIP POS module.
"use client";

import * as React from "react";
import type { CartPanelProps } from "./cart-panel";

const PosCartContext = React.createContext<CartPanelProps | null>(null);
const PosCartUpdateContext = React.createContext<(props: CartPanelProps | null) => void>(() => {});

export function PosCartProvider({ children }: { children: React.ReactNode }) {
  const [props, setProps] = React.useState<CartPanelProps | null>(null);
  return (
    <PosCartUpdateContext.Provider value={setProps}>
      <PosCartContext.Provider value={props}>
        {children}
      </PosCartContext.Provider>
    </PosCartUpdateContext.Provider>
  );
}

export function usePosCart() {
  return React.useContext(PosCartContext);
}

export function useSetPosCart() {
  return React.useContext(PosCartUpdateContext);
}
