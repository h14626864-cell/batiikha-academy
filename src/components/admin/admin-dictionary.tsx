"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPost, apiPatch, apiDelete } from "@/lib/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BookA, Plus, Trash2, Pencil, Loader2, Volume2, Search, Languages } from "lucide-react";

type Word = { id: string; arabic: string; english: string; description: string; createdAt: string };

/** Speak the English word using the browser TTS engine. */
export function speakEnglish(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    toast.error("المتصفح لا يدعم النطق الصوتي");
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.9;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("en"));
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

export default function AdminDictionary() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Word | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ arabic: "", english: "", description: "" });

  const { data: words, isLoading } = useQuery<Word[]>({
    queryKey: ["dictionary", search],
    queryFn: () => api(`/api/dictionary${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`),
  });

  const save = useMutation({
    mutationFn: () => {
      const payload = { arabic: form.arabic, english: form.english, description: form.description };
      return editing ? apiPatch(`/api/dictionary/${editing.id}`, payload) : apiPost("/api/dictionary", payload);
    },
    onSuccess: () => {
      toast.success(editing ? "تم تحديث الكلمة ✓" : "تمت إضافة الكلمة للقاموس ✓");
      setOpen(false); setEditing(null); setForm({ arabic: "", english: "", description: "" });
      qc.invalidateQueries({ queryKey: ["dictionary"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/dictionary/${id}`),
    onSuccess: () => { toast.success("تم حذف الكلمة"); qc.invalidateQueries({ queryKey: ["dictionary"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  function openEdit(w?: Word) {
    if (w) {
      setEditing(w);
      setForm({ arabic: w.arabic, english: w.english, description: w.description });
    } else {
      setEditing(null);
      setForm({ arabic: "", english: "", description: "" });
    }
    setOpen(true);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <BookA className="h-6 w-6 text-teal-700" /> القاموس
          </h1>
          <p className="text-slate-500 text-sm mt-1">أضف كلمة عربية وترجمتها الإنجليزية ليستفيد منها الطلاب مع النطق الصوتي</p>
        </div>
        <Button className="bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25 font-bold" onClick={() => openEdit()}>
          <Plus className="h-4 w-4 ml-1" /> كلمة جديدة
        </Button>
      </div>

      {/* search */}
      <div className="relative max-w-md mb-5">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="ابحث في القاموس..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9 bg-white" />
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}</div>
      ) : (words ?? []).length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-dashed">
          <Languages className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-semibold">{search ? "لا توجد نتائج مطابقة" : "القاموس فاضي — أضف أول كلمة!"}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(words ?? []).map((w) => (
            <Card key={w.id} className="border border-white/70 shadow-none">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-lg font-extrabold text-slate-800">{w.arabic}</p>
                    <p className="text-base font-bold text-teal-700" dir="ltr">{w.english}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="سماع النطق" onClick={() => speakEnglish(w.english)}>
                      <Volume2 className="h-4 w-4 text-teal-600" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="تعديل" onClick={() => openEdit(w)}>
                      <Pencil className="h-4 w-4 text-slate-400" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="حذف" onClick={() => confirm(`حذف "${w.arabic}" من القاموس؟`) && remove.mutate(w.id)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </div>
                {w.description && <p className="text-xs text-slate-500 leading-6 mt-2 border-t border-white/60 pt-2">{w.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* add/edit dialog */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative glass rounded-3xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-extrabold text-slate-800 mb-4">{editing ? "تعديل كلمة" : "إضافة كلمة للقاموس"}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>الكلمة بالعربي *</Label>
                  <Input value={form.arabic} onChange={(e) => setForm({ ...form, arabic: e.target.value })} placeholder="مثال: ماء" />
                </div>
                <div className="space-y-1.5">
                  <Label>الكلمة بالإنجليزي *</Label>
                  <Input dir="ltr" value={form.english} onChange={(e) => setForm({ ...form, english: e.target.value })} placeholder="water" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>وصف / مثال (اختياري)</Label>
                <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="شرح مبسط للكلمة أو مثال على استخدامها..." />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 font-bold bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25" disabled={!form.arabic.trim() || !form.english.trim() || save.isPending} onClick={() => save.mutate()}>
                  {save.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                  {editing ? "حفظ التعديلات" : "إضافة الكلمة"}
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
