import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "glass-input placeholder:text-slate-400 focus-visible:border-teal-400 focus-visible:ring-4 focus-visible:ring-teal-400/18 aria-invalid:ring-rose-400/20 aria-invalid:border-rose-400 flex field-sizing-content min-h-20 w-full rounded-2xl px-4 py-3 text-base transition-[color,box-shadow,background] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
