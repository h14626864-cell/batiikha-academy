"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPost, apiPatch, apiDelete } from "@/lib/client";
import { useHashRoute } from "@/lib/client";
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
import { Plus, BookOpen, Users, EyeOff, Eye, Settings2, Layers, Trash2, Pencil } from "lucide-react";

type Course = {
  id: string; title: string; description: string; isPublished: boolean; certRule: string;
  _count: { units: number; enrollments: number; exams: number; assignments: number };
};

export const CERT_RULE_LABEL: Record<string, string> = {
  NONE: "بدون شهادة",
  ALL_LESSONS: "إكمال كل الدروس",
  EXAM_PASS: "النجاح في امتحان محدد",
  LESSONS_AND_EXAM: "كل الدروس + النجاح في امتحان",
  ALL_TASKS: "إنجاز كل الواجبات والامتحانات",
};

export default function AdminCourses() {
  const { navigate } = useHashRoute();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState({ title: "", description: "", isPublished: false, certRule: "NONE" });

  const { data: courses, isLoading } = useQuery<Course[]>({ queryKey: ["admin-courses"], queryFn: () => api("/api/courses") });

  const save = useMutation({
    mutationFn: () => (editing ? apiPatch(`/api/courses/${editing.id}`, form) : apiPost("/api/courses", form)),
    onSuccess: () => {
      toast.success(editing ? "تم تحديث الكورس ✓" : "تم إنشاء الكورس ✓ — أضف الوحدات والدروس الآن");
      setOpen(false); setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePublish = useMutation({
    mutationFn: (c: Course) => apiPatch(`/api/courses/${c.id}`, { isPublished: !c.isPublished }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-courses"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/courses/${id}`),
    onSuccess: () => { toast.success("تم حذف الكورس"); qc.invalidateQueries({ queryKey: ["admin-courses"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  function openEdit(c?: Course) {
    if (c) {
      setEditing(c);
      setForm({ title: c.title, description: c.description, isPublished: c.isPublished, certRule: c.certRule });
    } else {
      setEditing(null);
      setForm({ title: "", description: "", isPublished: true, certRule: "NONE" });
    }
    setOpen(true);
  }

  if (isLoading) return <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-56 rounded-3xl" />)}</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">الكورسات والدروس</h1>
          <p className="text-slate-500 text-sm mt-1">أنشئ كورسات ووحدات ودروس (فيديو يوتيوب / PDF / نص / صور)</p>
        </div>
        <Button className="bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25 font-bold" onClick={() => openEdit()}>
          <Plus className="h-4 w-4 ml-1" /> كورس جديد
        </Button>
      </div>

      {(courses ?? []).length === 0 && (
        <div className="text-center py-20 text-slate-400 bg-white rounded-3xl border border-dashed">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-semibold">لا توجد كورسات بعد</p>
          <Button className="mt-4 bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25" onClick={() => openEdit()}>أنشئ أول كورس</Button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {(courses ?? []).map((c) => (
          <Card key={c.id} className="border-0 shadow-sm card-hover flex flex-col">
            <CardContent className="p-5 flex-1 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <Badge className={c.isPublished ? "bg-emerald-600" : "bg-slate-400"}>
                  {c.isPublished ? <><Eye className="h-3 w-3 ml-1" /> منشور</> : <><EyeOff className="h-3 w-3 ml-1" /> مسودة</>}
                </Badge>
                {c.certRule !== "NONE" && <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px]">شهادة: {CERT_RULE_LABEL[c.certRule]}</Badge>}
              </div>
              <h3 className="font-extrabold text-lg text-slate-800">{c.title}</h3>
              <p className="text-sm text-slate-500 line-clamp-2 mt-1 flex-1">{c.description || "بدون وصف"}</p>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-3 mb-4">
                <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {c._count.units} وحدة</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {c._count.enrollments}</span>
                <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {c._count.exams} امتحان</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25 font-bold" onClick={() => navigate(`#/admin/courses/${c.id}`)}>
                  <Settings2 className="h-4 w-4 ml-1" /> إدارة المحتوى
                </Button>
                <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => togglePublish.mutate(c)}>{c.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => confirm(`حذف كورس "${c.title}" نهائيًا مع كل محتواه؟`) && remove.mutate(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "تعديل الكورس" : "كورس جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>عنوان الكورس *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: أساسيات البرمجة" />
            </div>
            <div className="space-y-1.5">
              <Label>الوصف</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="وصف مختصر عن الكورس..." />
            </div>
            <div className="space-y-1.5">
              <Label>قاعدة منح الشهادة</Label>
              <Select value={form.certRule} onValueChange={(v) => setForm({ ...form, certRule: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CERT_RULE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400">لو اخترت &quot;امتحان محدد&quot; اربطه من صفحة إدارة المحتوى بعد إنشاء الامتحان</p>
            </div>
            <div className="flex items-center justify-between rounded-2xl border p-3">
              <Label>نشر الكورس للطلاب</Label>
              <Switch checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} />
            </div>
            <Button className="w-full font-bold bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25" disabled={!form.title.trim() || save.isPending} onClick={() => save.mutate()}>
              {editing ? "حفظ التعديلات" : "إنشاء الكورس"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
