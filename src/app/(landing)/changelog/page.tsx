import React, { Suspense } from "react";
import { getChangelogVersionsAction } from "@/server/actions/changelog.actions";
import { ChangelogClient } from "./changelog-client";

export default async function ChangelogPage() {
  const result = await getChangelogVersionsAction();
  const versions = result.success ? result.data : [];

  return (
    <Suspense fallback={null}>
      <ChangelogClient versions={versions} />
    </Suspense>
  );
}
