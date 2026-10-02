"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPost, apiPatch, apiDelete, fmtDate, fmtDateTimeLocal } from "@/lib/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, ClipboardCheck, Trash2, Pencil, Loader2, CheckCircle2, Paperclip, Users } from "lucide-react";

type Submission = {
  id: string; content: string; fileUrl: string | null; score: number | null; feedback: string | null;
  status: string; submittedAt: string; user: { id: string; name: string | null; email: string; image: string | null };
};
type Assignment = {
  id: string; title: string; description: string; dueDate: string | null; maxScore: number;
  allowFile: boolean; allowText: boolean; isPublished: boolean; course: { title: string };
  _count: { submissions: number }; submissions: Submission[];
};

export default function AdminAssignments() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [grading, setGrading] = useState<Submission | null>(null);
  const [gradeScore, setGradeScore] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");

  const [form, setForm] = useState({
    title: "", description: "", courseId: "", dueDate: "", maxScore: "100",
    allowFile: true, allowText: true, isPublished: true,
  });

  const { data: assignments, isLoading } = useQuery<Assignment[]>({ queryKey: ["admin-assignments"], queryFn: () => api("/api/assignments") });
  const { data: courses } = useQuery<{ id: string; title: string }[]>({ queryKey: ["admin-courses"], queryFn: () => api("/api/courses") });

  const save = useMutation({
    mutationFn: () => {
      const payload = { ...form, dueDate: form.dueDate || null, maxScore: Number(form.maxScore) || 100 };
      return editing ? apiPatch(`/api/assignments/${editing.id}`, payload) : apiPost("/api/assignments", payload);
    },
    onSuccess: () => {
      toast.success(editing ? "تم التحديث ✓" : "تم إنشاء الواجب ✓");
      setOpen(false); setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-assignments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/assignments/${id}`),
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["admin-assignments"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const grade = useMutation({
    mutationFn: () => apiPost(`/api/assignments/${grading!.id}/grade`, { score: Number(gradeScore), feedback: gradeFeedback }),
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => {
      toast.success("تم التقييم ✓");
      setGrading(null); setGradeScore(""); setGradeFeedback("");
      qc.invalidateQueries({ queryKey: ["admin-assignments"] });
    },
  });

  function openEdit(a?: Assignment) {
    if (a) {
      setEditing(a);
      setForm({
        title: a.title, description: a.description, courseId: "", dueDate: fmtDateTimeLocal(a.dueDate),
        maxScore: String(a.maxScore), allowFile: a.allowFile, allowText: a.allowText, isPublished: a.isPublished,
      });
    } else {
      setEditing(null);
      setForm({ title: "", description: "", courseId: courses?.[0]?.id ?? "", dueDate: "", maxScore: "100", allowFile: true, allowText: true, isPublished: true });
    }
    setOpen(true);
  }

  if (isLoading) return <Skeleton className="h-96 rounded-3xl" />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">الواجبات</h1>
          <p className="text-slate-500 text-sm mt-1">أنشئ واجبات وقيّم تسليمات الطلاب</p>
        </div>
        <Button className="bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25 font-bold" onClick={() => openEdit()} disabled={(courses ?? []).length === 0}>
          <Plus className="h-4 w-4 ml-1" /> واجب جديد
        </Button>
      </div>

      {(courses ?? []).length === 0 && (
        <div className="text-center py-10 text-slate-500 bg-white rounded-3xl border border-dashed text-sm">
          أنشئ كورسًا أولًا ثم أضف الواجبات
        </div>
      )}

      {(assignments ?? []).length === 0 && (courses ?? []).length > 0 && (
        <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-dashed">
          <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-semibold">لا توجد واجبات بعد</p>
        </div>
      )}

      <div className="space-y-4">
        {(assignments ?? []).map((a) => (
          <Card key={a.id} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-teal-700 font-bold">{a.course.title}</p>
                  <h3 className="font-extrabold text-lg text-slate-800">{a.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{a.description}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mt-2">
                    <span>الدرجة: {a.maxScore}</span>
                    <span>آخر موعد: {fmtDate(a.dueDate)}</span>
                    <span>{a.allowText ? "نص ✓" : ""} {a.allowFile ? "ملف ✓" : ""}</span>
                    {!a.isPublished && <Badge variant="secondary">مسودة</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" className="text-red-500" onClick={() => confirm(`حذف الواجب "${a.title}"؟`) && remove.mutate(a.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 border-t pt-4">
                <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> التسليمات ({a.submissions.length})
                </p>
                {a.submissions.length === 0 && <p className="text-xs text-slate-400">لا توجد تسليمات بعد</p>}
                <div className="grid sm:grid-cols-2 gap-2">
                  {a.submissions.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-white/60 p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-700">{s.user?.name || s.user?.email || "طالب"}</p>
                        <p className="text-xs text-slate-400">{fmtDate(s.submittedAt)}</p>
                      </div>
                      <Badge className={s.status === "GRADED" ? "bg-emerald-600" : "bg-amber-500"}>
                        {s.status === "GRADED" ? `${s.score}/${a.maxScore}` : "بالانتظار"}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => { setGrading(s); setGradeScore(s.score !== null ? String(s.score) : ""); setGradeFeedback(s.feedback ?? ""); }}>
                        {s.status === "GRADED" ? "تعديل التقييم" : "تقييم"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* create/edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل الواجب" : "واجب جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>الكورس *</Label>
              <Select value={form.courseId} onValueChange={(v) => setForm({ ...form, courseId: v })} disabled={!!editing}>
                <SelectTrigger><SelectValue placeholder="اختر الكورس" /></SelectTrigger>
                <SelectContent>
                  {(courses ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>عنوان الواجب *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>الوصف / التعليمات</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>آخر موعد للتسليم</Label>
                <Input type="datetime-local" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>الدرجة الكلية</Label>
                <Input type="number" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-2xl border p-3"><Label>يقبل نصًا</Label><Switch checked={form.allowText} onCheckedChange={(v) => setForm({ ...form, allowText: v })} /></div>
            <div className="flex items-center justify-between rounded-2xl border p-3"><Label>يقبل ملف (PDF/صورة)</Label><Switch checked={form.allowFile} onCheckedChange={(v) => setForm({ ...form, allowFile: v })} /></div>
            <div className="flex items-center justify-between rounded-2xl border p-3"><Label>منشور للطلاب</Label><Switch checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} /></div>
            <Button
              className="w-full font-bold bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25"
              disabled={!form.title.trim() || save.isPending || (!editing && !form.courseId)}
              onClick={() => save.mutate()}
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              {editing ? "حفظ" : "إنشاء الواجب"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* grade dialog */}
      <Dialog open={!!grading} onOpenChange={(o) => !o && setGrading(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>تقييم التسليم</DialogTitle></DialogHeader>
          {grading && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-700">{grading.user?.name || grading.user?.email || "طالب"}</p>
              {grading.content && (
                <div className="rounded-2xl bg-white/50 p-4 text-sm text-slate-600 whitespace-pre-wrap max-h-40 overflow-y-auto">{grading.content}</div>
              )}
              {grading.fileUrl && (
                <a href={grading.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-bold text-teal-700 hover:underline">
                  <Paperclip className="h-4 w-4" /> فتح الملف المرفق
                </a>
              )}
              <div className="grid grid-cols-[120px_1fr] gap-3">
                <div className="space-y-1.5">
                  <Label>الدرجة</Label>
                  <Input type="number" value={gradeScore} onChange={(e) => setGradeScore(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>ملاحظات للطالب</Label>
                  <Input value={gradeFeedback} onChange={(e) => setGradeFeedback(e.target.value)} placeholder="أحسنت! لكن انتبه ل..." />
                </div>
              </div>
              <Button className="w-full font-bold bg-emerald-600 hover:bg-emerald-700" disabled={gradeScore === "" || grade.isPending} onClick={() => grade.mutate()}>
                <CheckCircle2 className="h-4 w-4 ml-2" /> حفظ التقييم
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
