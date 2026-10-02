"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("batiikha-theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={dark ? "التبديل للوضع النهاري" : "التبديل للوضع الليلي"}
      title={dark ? "الوضع النهاري ☀️" : "الوضع الليلي 🌙"}
      className={cn("rounded-full", className)}
    >
      {dark === null ? (
        <span className="h-5 w-5" />
      ) : dark ? (
        <Sun className="h-5 w-5 text-amber-400" />
      ) : (
        <Moon className="h-5 w-5 text-slate-500" />
      )}
    </Button>
  );
}
