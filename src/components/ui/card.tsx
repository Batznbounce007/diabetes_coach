import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card/95 p-6 shadow-sm backdrop-blur",
        className
      )}
      {...props}
    />
  );
}
