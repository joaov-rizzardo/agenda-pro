import * as React from "react"

import { cn } from "@/lib/utils"

function ScanLine({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="scan-line"
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 h-px bg-[image:var(--gradient-primary)] motion-safe:animate-scan-line",
        className
      )}
      {...props}
    />
  )
}

export { ScanLine }
