import React, { Suspense } from "react";
import { ChangelogContent } from "./changelog-content";

export const dynamic = "force-dynamic";

export default async function ChangelogPage() {
  return (
    <Suspense fallback={null}>
      <ChangelogContent />
    </Suspense>
  );
}
