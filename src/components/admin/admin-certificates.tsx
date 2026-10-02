"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPost, apiDelete, fmtDate } from "@/lib/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Award, Plus, Trash2, Printer, ShieldCheck } from "lucide-react";

type Cert = {
  id: string; serial: string; title: string; reason: string; score: number | null; issuedAt: string;
  user: { name: string | null; email: string };
  course: { title: string } | null;
};
type Student = { id: string; name: string | null; email: string; role: string };

export default function AdminCertificates() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ userId: "", title: "", reason: "", score: "" });

  const { data: certs, isLoading } = useQuery<Cert[]>({ queryKey: ["admin-certs"], queryFn: () => api("/api/certificates") });
  const { data: students } = useQuery<Student[]>({
    queryKey: ["admin-students"],
    queryFn: () => api("/api/admin/students"),
  });

  const issue = useMutation({
    mutationFn: () => apiPost("/api/admin/issue-certificate", {
      userId: form.userId, title: form.title, reason: form.reason,
      score: form.score ? Number(form.score) : undefined,
    }),
    onSuccess: () => {
      toast.success("تم إصدار الشهادة ✓ — يستطيع الطالب رؤيتها في صفحة شهاداتي");
      setOpen(false); setForm({ userId: "", title: "", reason: "", score: "" });
      qc.invalidateQueries({ queryKey: ["admin-certs"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/issue-certificate?id=${id}`),
    onSuccess: () => { toast.success("تم حذف الشهادة"); qc.invalidateQueries({ queryKey: ["admin-certs"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-96 rounded-3xl" />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2"><Award className="h-6 w-6 text-teal-700" /> الشهادات</h1>
          <p className="text-slate-500 text-sm mt-1">
            الشهادات التلقائية تُصدر حسب قاعدة كل كورس — ويمكنك إصدار شهادة يدوية لأي طالب
          </p>
        </div>
        <Button className="bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25 font-bold" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 ml-1" /> إصدار شهادة يدويًا
        </Button>
      </div>

      {(certs ?? []).length === 0 && (
        <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-dashed">
          <Award className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-semibold">لم تصدر أي شهادات بعد</p>
          <p className="text-xs mt-1">فعّل قاعدة شهادة على الكورس أو أصدر يدويًا</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(certs ?? []).map((c) => (
          <Card key={c.id} className="border-0 shadow-sm">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-start justify-between">
                <Award className="h-8 w-8 text-amber-500" />
                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-300" onClick={() => confirm(`حذف شهادة "${c.title}"؟`) && remove.mutate(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="font-extrabold text-slate-800">{c.title}</p>
              <p className="text-sm text-slate-600">{c.user.name ?? c.user.email}</p>
              {c.reason && <p className="text-xs text-slate-400">{c.reason}</p>}
              {c.score !== null && <Badge className="bg-emerald-600">{c.score}%</Badge>}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t">
                <span className="font-mono" dir="ltr">{c.serial}</span>
                <span>{fmtDate(c.issuedAt)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-teal-700" /> إصدار شهادة يدويًا</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>الطالب *</Label>
              <Select value={form.userId} onValueChange={(v) => setForm({ ...form, userId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
                <SelectContent>
                  {(students ?? []).filter((s) => s.role === "STUDENT").map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name ?? s.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>اسم / عنوان الشهادة *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: شهادة تفوق في الرياضيات" />
            </div>
            <div className="space-y-1.5">
              <Label>سبب الإصدار</Label>
              <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="اختياري" />
            </div>
            <div className="space-y-1.5">
              <Label>الدرجة (%)</Label>
              <Input type="number" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} placeholder="اختياري" />
            </div>
            <Button className="w-full font-bold bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25" disabled={!form.userId || !form.title.trim() || issue.isPending} onClick={() => issue.mutate()}>
              <Printer className="h-4 w-4 ml-2" /> إصدار الشهادة
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
