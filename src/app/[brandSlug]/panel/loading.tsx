import React from "react";
import { Loader2 } from "lucide-react";

export default function PanelLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Memuat...</p>
      </div>
    </div>
  );
}
