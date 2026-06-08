import React from "react";
import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: () => void;
}

export function ErrorState({
  title = "Terjadi Kesalahan",
  message,
  retry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="h-12 w-12 text-red-500" />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">{message}</p>
      {retry && (
        <button
          onClick={retry}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Coba Lagi
        </button>
      )}
    </div>
  );
}
