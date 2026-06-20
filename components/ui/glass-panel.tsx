import * as React from "react"

import { cn } from "@/lib/utils"

function GlassPanel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-panel"
      className={cn(
        "rounded-2xl border [background-color:var(--glass-bg)] [border-color:var(--glass-border)] [backdrop-filter:blur(var(--glass-blur))]",
        className
      )}
      {...props}
    />
  )
}

export { GlassPanel }
