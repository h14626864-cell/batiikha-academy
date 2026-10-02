"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookA, Volume2, Search, Languages, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Word = { id: string; arabic: string; english: string; description: string; createdAt: string };

export default function StudentDictionary() {
  const [search, setSearch] = useState("");
  const [speaking, setSpeaking] = useState<string | null>(null);

  const { data: words, isLoading } = useQuery<Word[]>({
    queryKey: ["dictionary", search],
    queryFn: () => api(`/api/dictionary${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`),
  });

  function speak(w: Word) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("المتصفح لا يدعم النطق الصوتي");
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(w.english);
    u.lang = "en-US";
    u.rate = 0.85;
    u.onstart = () => setSpeaking(w.id);
    u.onend = () => setSpeaking(null);
    u.onerror = () => setSpeaking(null);
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("en"));
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
          <BookA className="h-6 w-6 text-teal-700" /> القاموس
        </h1>
        <p className="text-slate-500 text-sm mt-1">تعلم كلمات إنجليزية جديدة — اضغط زر السماع لسماع النطق الصحيح</p>
      </div>

      {/* search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="ابحث عن كلمة..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9 bg-white" />
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36 rounded-3xl" />)}</div>
      ) : (words ?? []).length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-dashed">
          <Languages className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-semibold">{search ? "لا توجد نتائج مطابقة لكلمة البحث" : "لم تُضف كلمات للقاموس بعد"}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(words ?? []).map((w) => (
            <Card key={w.id} className="border border-white/70 shadow-none card-hover">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xl font-extrabold text-slate-800">{w.arabic}</p>
                    <p className="text-lg font-bold text-teal-700 mt-0.5" dir="ltr">{w.english}</p>
                  </div>
                  <Button
                    size="icon"
                    aria-label="اسمع النطق"
                    onClick={() => speak(w)}
                    className="h-11 w-11 rounded-full shrink-0 bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25 text-white shadow-sm"
                  >
                    {speaking === w.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Volume2 className="h-5 w-5" />}
                  </Button>
                </div>
                {w.description && (
                  <p className="text-xs text-slate-500 leading-6 mt-3 border-t border-white/60 pt-3">{w.description}</p>
                )}
                {w.description && <Badge variant="secondary" className="mt-2 bg-white/60 text-slate-500 border-0 text-[10px]">مع وصف</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
