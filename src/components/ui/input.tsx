import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "glass-input file:text-foreground placeholder:text-slate-400 selection:bg-teal-500 selection:text-white flex h-11 w-full min-w-0 rounded-2xl px-4 py-2 text-base transition-[color,box-shadow,background] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-teal-400 focus-visible:ring-4 focus-visible:ring-teal-400/18",
        "aria-invalid:ring-rose-400/20 aria-invalid:border-rose-400",
        className
      )}
      {...props}
    />
  )
}

export { Input }
