"use client";

import { useEffect, useState, useCallback } from "react";

/** Fetch JSON with error handling; throws Error(message) on non-OK. */
export async function api<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "حدث خطأ غير متوقع");
  return data as T;
}

export const apiPost = <T,>(path: string, body: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(body) });
export const apiPatch = <T,>(path: string, body: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const apiDelete = <T,>(path: string) => api<T>(path, { method: "DELETE" });

/** Tiny hash router: returns current path segments and a navigate fn. */
export function useHashRoute(): { segs: string[]; navigate: (to: string) => void } {
  const [hash, setHash] = useState("");

  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    onChange();
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to;
    window.scrollTo({ top: 0 });
  }, []);

  const segs = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  return { segs, navigate };
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }) +
    " - " + date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

export function fmtDateTimeLocal(d: string | Date | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

/** Extract YouTube video id from any url form. */
export function youtubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube-nocookie\.com\/embed\/)([\w-]{11})/,
    /^([\w-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export const LESSON_TYPE_LABEL: Record<string, string> = {
  VIDEO: "فيديو",
  PDF: "ملف PDF",
  TEXT: "نص",
  IMAGE: "صورة",
};
