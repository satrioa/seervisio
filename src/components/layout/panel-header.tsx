"use client";

import React from "react";

interface HeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PanelHeader({ title, description, actions }: HeaderProps) {
  return (
    <div className="flex items-center justify-between border-b px-6 py-4">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
