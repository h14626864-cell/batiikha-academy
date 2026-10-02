"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPost, apiPatch, apiDelete, LESSON_TYPE_LABEL } from "@/lib/client";
import { useHashRoute } from "@/lib/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowRight, Plus, PlayCircle, FileText, Type, Image as ImageIcon,
  Upload, Loader2, Trash2, Pencil, GripVertical, Award, Layers,
} from "lucide-react";

type Lesson = { id: string; title: string; type: string; content: string };
type Unit = { id: string; title: string; lessons: Lesson[] };
type CourseData = {
  id: string; title: string; description: string; certRule: string; certExamId: string | null;
  units: Unit[]; exams: { id: string; title: string }[];
  _count: { enrollments: number };
};

const TYPE_ICON: Record<string, typeof PlayCircle> = { VIDEO: PlayCircle, PDF: FileText, TEXT: Type, IMAGE: ImageIcon };

export default function AdminCourseEditor({ courseId }: { courseId: string }) {
  const { navigate } = useHashRoute();
  const qc = useQueryClient();
  const [unitDialog, setUnitDialog] = useState(false);
  const [unitTitle, setUnitTitle] = useState("");
  const [editingUnit, setEditingUnit] = useState<string | null>(null);
  const [lessonDialog, setLessonDialog] = useState<string | null>(null); // unitId
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  const [lessonForm, setLessonForm] = useState({ title: "", type: "VIDEO", content: "" });
  const [uploading, setUploading] = useState(false);

  const { data: course, isLoading } = useQuery<CourseData>({
    queryKey: ["admin-course", courseId],
    queryFn: () => api(`/api/courses/${courseId}`),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-course", courseId] });
    qc.invalidateQueries({ queryKey: ["admin-courses"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const addUnit = useMutation({
    mutationFn: () => apiPost(`/api/courses/${courseId}/units`, { title: unitTitle }),
    onSuccess: () => { toast.success("تمت إضافة الوحدة ✓"); setUnitDialog(false); setUnitTitle(""); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const renameUnit = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => apiPatch(`/api/units/${id}`, { title }),
    onSuccess: () => { toast.success("تم التعديل"); setEditingUnit(null); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteUnit = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/units/${id}`),
    onSuccess: () => { toast.success("تم حذف الوحدة"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveLesson = useMutation({
    mutationFn: () => {
      if (editingLesson) return apiPatch(`/api/lessons/${editingLesson.id}`, lessonForm);
      return apiPost(`/api/units/${lessonDialog}/lessons`, lessonForm);
    },
    onSuccess: () => {
      toast.success(editingLesson ? "تم حفظ الدرس ✓" : "تمت إضافة الدرس ✓");
      setLessonDialog(null); setEditingLesson(null);
      setLessonForm({ title: "", type: "VIDEO", content: "" });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteLesson = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/lessons/${id}`),
    onSuccess: () => { toast.success("تم حذف الدرس"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateCertExam = useMutation({
    mutationFn: (certExamId: string) => apiPatch(`/api/courses/${courseId}`, { certExamId }),
    onSuccess: () => { toast.success("تم ربط امتحان الشهادة"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function upload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLessonForm((f) => ({ ...f, content: data.url }));
      toast.success("تم رفع الملف ✓");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الرفع");
    } finally {
      setUploading(false);
    }
  }

  if (isLoading || !course) return <div className="space-y-4"><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></div>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("#/admin/courses")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-teal-700 font-semibold">
        <ArrowRight className="h-4 w-4" /> رجوع للكورسات
      </button>

      <div className="bg-white rounded-3xl border p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">{course.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{course._count.enrollments} طالب مشترك • {course.units.length} وحدة • {course.units.reduce((s, u) => s + u.lessons.length, 0)} درس</p>
        </div>
        <Button className="bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25 font-bold" onClick={() => { setEditingUnit(null); setUnitTitle(""); setUnitDialog(true); }}>
          <Plus className="h-4 w-4 ml-1" /> وحدة جديدة
        </Button>
      </div>

      {/* certificate exam binding */}
      {course.certRule !== "NONE" && course.certRule !== "ALL_LESSONS" && course.certRule !== "ALL_TASKS" && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <Award className="h-5 w-5 text-amber-600" />
            <p className="text-sm font-bold text-amber-900">امتحان الشهادة:</p>
            <Select value={course.certExamId ?? ""} onValueChange={(v) => updateCertExam.mutate(v)}>
              <SelectTrigger className="w-64 bg-white"><SelectValue placeholder="اختر الامتحان" /></SelectTrigger>
              <SelectContent>
                {course.exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-amber-700">شهادة الكورس تُمنح تلقائيًا عند النجاح في هذا الامتحان (+ شروط القاعدة)</p>
          </CardContent>
        </Card>
      )}

      {course.units.length === 0 && (
        <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-dashed">
          <Layers className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-semibold">ابدأ بإضافة أول وحدة ثم أضف دروسها</p>
        </div>
      )}

      {course.units.map((u, ui) => (
        <Card key={u.id} className="border-0 shadow-sm">
          <CardHeader className="bg-white/50 py-4 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-slate-300" />
              {editingUnit === u.id ? (
                <Input
                  defaultValue={u.title} autoFocus
                  onBlur={(e) => { if (e.target.value.trim() && e.target.value !== u.title) renameUnit.mutate({ id: u.id, title: e.target.value.trim() }); else setEditingUnit(null); }}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  className="w-72"
                />
              ) : (
                <>
                  <span className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white text-xs font-extrabold w-7 h-7 rounded-xl flex items-center justify-center">{ui + 1}</span>
                  {u.title}
                </>
              )}
            </CardTitle>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditingUnit(u.id)}><Pencil className="h-4 w-4 text-slate-400" /></Button>
              <Button size="sm" variant="ghost" onClick={() => confirm(`حذف الوحدة "${u.title}" وكل دروسها؟`) && deleteUnit.mutate(u.id)}>
                <Trash2 className="h-4 w-4 text-red-400" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 space-y-1">
            {u.lessons.length === 0 && <p className="text-xs text-slate-400 p-3">لا توجد دروس — أضف أول درس</p>}
            {u.lessons.map((l, li) => {
              const Icon = TYPE_ICON[l.type] ?? Type;
              return (
                <div key={l.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-white/50 border border-transparent hover:border-white/60">
                  <span className="p-2 rounded-xl bg-teal-500/10 text-teal-700"><Icon className="h-4 w-4" /></span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-700 truncate">{l.title}</p>
                    <p className="text-xs text-slate-400 truncate" dir={l.type === "VIDEO" ? "ltr" : undefined}>
                      {LESSON_TYPE_LABEL[l.type]} {l.type !== "TEXT" && l.content ? `• ${l.content.length > 50 ? l.content.slice(0, 50) + "…" : l.content}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-slate-300">درس {li + 1}</span>
                  <Button size="icon" variant="ghost" onClick={() => { setEditingLesson(l); setLessonForm({ title: l.title, type: l.type, content: l.content }); setLessonDialog(u.id); }}>
                    <Pencil className="h-4 w-4 text-slate-400" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => confirm(`حذف الدرس "${l.title}"؟`) && deleteLesson.mutate(l.id)}>
                    <Trash2 className="h-4 w-4 text-red-300" />
                  </Button>
                </div>
              );
            })}
            <Button size="sm" variant="outline" className="w-full border-dashed mt-1 text-teal-700 hover:bg-teal-500/10" onClick={() => { setEditingLesson(null); setLessonForm({ title: "", type: "VIDEO", content: "" }); setLessonDialog(u.id); }}>
              <Plus className="h-4 w-4 ml-1" /> إضافة درس
            </Button>
          </CardContent>
        </Card>
      ))}

      {/* unit dialog */}
      <Dialog open={unitDialog} onOpenChange={setUnitDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>وحدة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="عنوان الوحدة (مثال: الوحدة الأولى)" value={unitTitle} onChange={(e) => setUnitTitle(e.target.value)} />
            <Button className="w-full font-bold bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25" disabled={!unitTitle.trim() || addUnit.isPending} onClick={() => addUnit.mutate()}>إضافة</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* lesson dialog */}
      <Dialog open={!!lessonDialog} onOpenChange={(o) => { if (!o) { setLessonDialog(null); setEditingLesson(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingLesson ? "تعديل درس" : "درس جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>عنوان الدرس *</Label>
              <Input value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} placeholder="مثال: مقدمة في البرمجة" />
            </div>
            <div className="space-y-1.5">
              <Label>نوع الدرس</Label>
              <Select value={lessonForm.type} onValueChange={(v) => setLessonForm({ ...lessonForm, type: v, content: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIDEO">🎬 فيديو (لينك يوتيوب)</SelectItem>
                  <SelectItem value="PDF">📄 ملف PDF (رفع على السيرفر)</SelectItem>
                  <SelectItem value="TEXT">📝 نص عادي</SelectItem>
                  <SelectItem value="IMAGE">🖼️ صورة (رفع على السيرفر)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {lessonForm.type === "VIDEO" && (
              <div className="space-y-1.5">
                <Label>رابط يوتيوب *</Label>
                <Input dir="ltr" value={lessonForm.content} onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
              </div>
            )}

            {(lessonForm.type === "PDF" || lessonForm.type === "IMAGE") && (
              <div className="space-y-1.5">
                <Label>{lessonForm.type === "PDF" ? "ملف PDF" : "صورة"} *</Label>
                <Input type="file" accept={lessonForm.type === "PDF" ? ".pdf" : "image/*"} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} className="cursor-pointer" />
                {uploading && <p className="text-xs text-teal-700 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> جاري الرفع على السيرفر...</p>}
                {lessonForm.content && (
                  <p className="text-xs text-emerald-700 flex items-center gap-1">
                    <Upload className="h-3 w-3" /> تم الرفع: <span dir="ltr" className="truncate">{lessonForm.content}</span>
                  </p>
                )}
              </div>
            )}

            {lessonForm.type === "TEXT" && (
              <div className="space-y-1.5">
                <Label>محتوى الدرس النصي *</Label>
                <Textarea rows={6} value={lessonForm.content} onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })} placeholder="اكتب محتوى الدرس..." />
              </div>
            )}

            <Button
              className="w-full font-bold bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25"
              disabled={!lessonForm.title.trim() || !lessonForm.content.trim() || saveLesson.isPending || uploading}
              onClick={() => saveLesson.mutate()}
            >
              {saveLesson.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              {editingLesson ? "حفظ التعديلات" : "إضافة الدرس"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
