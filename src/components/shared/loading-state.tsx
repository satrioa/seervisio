import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Memuat data..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-muted-foreground mt-3 text-sm">{message}</p>
    </div>
  );
}
