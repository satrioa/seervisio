"use client";

import type { ChangelogVersion } from "@/types/changelog";
import { ChangelogForm } from "../../_components/changelog-form";

interface EditChangelogClientProps {
  release: ChangelogVersion;
}

export function EditChangelogClient({ release }: EditChangelogClientProps) {
  return <ChangelogForm initialData={release} />;
}
