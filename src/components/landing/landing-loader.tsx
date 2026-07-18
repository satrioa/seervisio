"use client";

import * as React from "react";
import { BrandLoader } from "./brand-loader";

export function LandingLoader({ children }: { children: React.ReactNode }) {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    // Show the brand loader only on the first landing visit per session.
    try {
      const seen = sessionStorage.getItem("seervisio_landing_seen");
      if (!seen) {
        setShow(true);
        sessionStorage.setItem("seervisio_landing_seen", "1");
      }
    } catch {
      setShow(true);
    }
  }, []);

  return (
    <>
      {show && <BrandLoader />}
      {children}
    </>
  );
}

export default LandingLoader;
