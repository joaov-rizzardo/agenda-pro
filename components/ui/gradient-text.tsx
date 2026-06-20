import * as React from "react"

import { cn } from "@/lib/utils"

function GradientText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="gradient-text"
      className={cn(
        "text-primary supports-[background-clip:text]:bg-[image:var(--gradient-primary)] supports-[background-clip:text]:bg-clip-text supports-[background-clip:text]:text-transparent",
        className
      )}
      {...props}
    />
  )
}

export { GradientText }
