"use client";

import {
  Children,
  createContext,
  HTMLAttributes,
  isValidElement,
  type ReactElement,
  useContext
} from "react";
import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";

type PartitionBarContextType = {
  total: number;
  size: VariantProps<typeof partitionBarVariants>["size"];
};

const PartitionBarCtxt = createContext<PartitionBarContextType | null>(null);

function usePartitionBarContext(): PartitionBarContextType {
  const context = useContext(PartitionBarCtxt);
  if (!context) {
    throw new Error(
      "usePartitionBarContext must be used within a PartitionBarProvider"
    );
  }
  return context;
}

//////////////////////////////////////////////////////////////////////////////

const partitionBarVariants = cva("flex flex-row", {
  variants: {
    size: {
      sm: "text-xs",
      md: "text-sm",
      lg: "text-md"
    }
  },
  defaultVariants: {
    size: "md"
  }
});

interface PartitionBar
  extends HTMLAttributes<HTMLUListElement>,
    VariantProps<typeof partitionBarVariants> {
  children?:
    | ReactElement<PartitionBarSegment>
    | ReactElement<PartitionBarSegment>[];
  gap?: number;
}

export default function PartitionBar({
  children,
  className,
  gap = 1,
  size,
  ...props
}: PartitionBar) {
  const total = Children.toArray(children).reduce<number>(
    (sum, child) =>
      isValidElement(child)
        ? sum + ((child.props as PartitionBarSegment).num || 0)
        : sum,
    0
  );

  return (
    <PartitionBarCtxt.Provider value={{ total, size }}>
      <ul
        className={cn("w-full", partitionBarVariants({ size }), className)}
        style={{
          gap: `${gap * 4}px`
        }}
        {...props}
      >
        {children}
      </ul>
    </PartitionBarCtxt.Provider>
  );
}

////////////////////////////////////////////////////////////////////////////

const partitionBarLineVariants = cva("", {
  variants: {
    variant: {
      default: "bg-primary",
      secondary: "bg-primary/60",
      destructive: "bg-destructive",
      outline: "border border-input bg-background",
      muted: "bg-primary/40"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});

interface PartitionBarSegment
  extends HTMLAttributes<HTMLLIElement>,
    VariantProps<typeof partitionBarLineVariants> {
  children?: React.ReactNode;
  num?: number;
  variant?: VariantProps<typeof partitionBarLineVariants>["variant"];
  alignment?: "left" | "center" | "right";
}

export function PartitionBarSegment({
  children,
  num = 0,
  variant = "default",
  alignment = "center",
  className,
  ...props
}: PartitionBarSegment) {
  const { total, size } = usePartitionBarContext();

  const widthPercent = total > 0 ? (num / total) * 100 : 0;

  return (
    <li
      className="flex min-w-0 flex-col"
      style={{
        flexBasis: `${widthPercent}%`,
        flexGrow: 0,
        flexShrink: 0
      }}
      {...props}
    >
      <div
        className={cn(
          partitionBarLineVariants({ variant }),
          "flex w-full shrink-0 items-center justify-center overflow-hidden rounded-full px-2",
          size === "sm" ? "h-9" : size === "md" ? "h-12" : "h-14",
          className
        )}
      >
        <div
          className={cn(
            variant === "outline" ? "text-foreground" : "text-primary-foreground",
            "text-[11px] font-semibold tabular-nums"
          )}
        >
          {num}
        </div>
      </div>
      <div
        className={cn(
          "w-full whitespace-normal text-foreground",
          size === "sm" ? "mt-2" : size === "md" ? "mt-2.5" : "mt-3",
          alignment === "left" && "text-left",
          alignment === "center" && "text-center",
          alignment === "right" && "text-right"
        )}
      >
        {children}
      </div>
    </li>
  );
}

/////////////////////////////////////////////////////////////////////////////

interface PartitionBarSegmentTitle extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PartitionBarSegmentTitle({
  children,
  className
}: PartitionBarSegmentTitle) {
  return <div className={cn("max-w-full truncate text-xs font-semibold", className)}>{children}</div>;
}

interface PartitionBarSegmentValue extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PartitionBarSegmentValue({
  children,
  className
}: PartitionBarSegmentValue) {
  return (
    <div className={cn("sr-only", className)}>
      {children}
    </div>
  );
}
