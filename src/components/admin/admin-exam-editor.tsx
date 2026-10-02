"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPost, apiPatch, fmtDate, fmtDateTimeLocal } from "@/lib/client";
import { useHashRoute } from "@/lib/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowRight, Plus, Trash2, Save, Copy, ShieldAlert, Clock, Users,
  FileQuestion, Eye, EyeOff, RefreshCw, AlertTriangle, CheckCircle2,
} from "lucide-react";

type Q = { id?: string; text: string; type: "MCQ" | "TRUE_FALSE"; options: string[]; correct: string; marks: number };
type ExamDetail = {
  id: string; title: string; description: string; courseId: string | null; durationMin: number;
  openAt: string | null; closeAt: string | null; passScore: number; maxViolations: number;
  shuffleQuestions: boolean; showResults: boolean; isPublished: boolean; accessToken: string;
  course: { title: string } | null;
  questions: { text: string; type: string; options: string; correct: string; marks: number }[];
  attempts: {
    id: string; percentage: number | null; passed: boolean | null; status: string; violationCount: number;
    autoSubmitted: boolean; startedAt: string; finishedAt: string | null; score: number | null; totalMarks: number | null;
    user: { id: string; name: string | null; email: string; image: string | null };
    violations: string;
  }[];
};

export default function AdminExamEditor({ examId }: { examId: string }) {
  const isNew = examId === "new";
  const { data: courses } = useQuery<{ id: string; title: string }[]>({ queryKey: ["admin-courses"], queryFn: () => api("/api/courses") });
  const { data: exam } = useQuery<ExamDetail>({
    queryKey: ["admin-exam", examId],
    queryFn: () => api(`/api/exams/${examId}`),
    enabled: !isNew,
  });

  if (!isNew && !exam) return <Skeleton className="h-96 rounded-3xl" />;

  // key forces fresh state when exam data arrives
  return (
    <ExamForm
      key={exam?.id ?? "new"}
      initialExam={exam ?? null}
      courses={courses ?? []}
    />
  );
}

function ExamForm({ initialExam, courses }: { initialExam: ExamDetail | null; courses: { id: string; title: string }[] }) {
  const { navigate } = useHashRoute();
  const qc = useQueryClient();
  const isNew = !initialExam;

  const [form, setForm] = useState(() => ({
    title: initialExam?.title ?? "",
    description: initialExam?.description ?? "",
    courseId: initialExam?.courseId ?? "",
    durationMin: String(initialExam?.durationMin ?? 30),
    openAt: fmtDateTimeLocal(initialExam?.openAt),
    closeAt: fmtDateTimeLocal(initialExam?.closeAt),
    passScore: String(initialExam?.passScore ?? 50),
    maxViolations: String(initialExam?.maxViolations ?? 3),
    shuffleQuestions: initialExam?.shuffleQuestions ?? true,
    showResults: initialExam?.showResults ?? true,
    isPublished: initialExam?.isPublished ?? false,
  }));

  const [questions, setQuestions] = useState<Q[]>(() =>
    (initialExam?.questions ?? []).map((q) => ({
      text: q.text,
      type: q.type === "TRUE_FALSE" ? ("TRUE_FALSE" as const) : ("MCQ" as const),
      options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
      correct: q.correct,
      marks: q.marks,
    }))
  );
  const [savedId, setSavedId] = useState<string | null>(initialExam?.id ?? null);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form, durationMin: Number(form.durationMin), passScore: Number(form.passScore), maxViolations: Number(form.maxViolations),
        openAt: form.openAt || null, closeAt: form.closeAt || null, questions,
      };
      if (savedId) return apiPatch(`/api/exams/${savedId}`, payload);
      const created = await apiPost<{ id: string }>("/api/exams", payload);
      setSavedId(created.id);
      window.history.replaceState(null, "", `#/admin/exams/${created.id}`);
      return created;
    },
    onSuccess: () => {
      toast.success("تم حفظ الامتحان ✓");
      qc.invalidateQueries({ queryKey: ["admin-exams"] });
      qc.invalidateQueries({ queryKey: ["admin-exam", savedId] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const refreshLink = useMutation({
    mutationFn: () => apiPatch(`/api/exams/${savedId}`, { refreshToken: true }),
    onSuccess: () => { toast.success("تم توليد لينك جديد — اللينك القديم لم يعمل"); qc.invalidateQueries({ queryKey: ["admin-exam", savedId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  function addQuestion(type: "MCQ" | "TRUE_FALSE") {
    setQuestions((qs) => [
      ...qs,
      type === "MCQ"
        ? { text: "", type, options: ["", "", "", ""], correct: "", marks: 1 }
        : { text: "", type, options: ["صح", "خطأ"], correct: "", marks: 1 },
    ]);
  }

  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
  const shareUrl = typeof window !== "undefined" && initialExam ? `${window.location.origin}/#/exam/${initialExam.accessToken}` : "";

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("#/admin/exams")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-teal-700 font-semibold">
        <ArrowRight className="h-4 w-4" /> رجوع للامتحانات
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-800">{isNew ? "امتحان جديد" : `إدارة: ${initialExam.title}`}</h1>
        {!isNew && (
          <Badge className={initialExam.isPublished ? "bg-emerald-600" : "bg-slate-400"}>
            {initialExam.isPublished ? <><Eye className="h-3 w-3 ml-1" /> منشور</> : <><EyeOff className="h-3 w-3 ml-1" /> مسودة</>}
          </Badge>
        )}
      </div>

      {/* exam settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-lg">إعدادات الامتحان</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>الكورس (اختياري)</Label>
              <Select value={form.courseId || "__none"} onValueChange={(v) => setForm({ ...form, courseId: v === "__none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="اختر الكورس" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">
                    <span className="flex items-center gap-2 text-teal-700 font-bold"><FileQuestion className="h-4 w-4" /> امتحان مستقل (بدون كورس)</span>
                  </SelectItem>
                  {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-400">اتركه "امتحان مستقل" لو الامتحان مش مرتبط بكورس — هيظهر لكل الطلاب في صفحة الامتحانات</p>
            </div>
            <div className="space-y-1.5">
              <Label>عنوان الامتحان *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: الامتحان النهائي" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>وصف / تعليمات</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> المدة (دقيقة) *</Label>
              <Input type="number" min={1} value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>يفتح في</Label>
              <Input type="datetime-local" value={form.openAt} onChange={(e) => setForm({ ...form, openAt: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>يقفل في</Label>
              <Input type="datetime-local" value={form.closeAt} onChange={(e) => setForm({ ...form, closeAt: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>درجة النجاح (%)</Label>
              <Input type="number" min={0} max={100} value={form.passScore} onChange={(e) => setForm({ ...form, passScore: e.target.value })} />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="flex items-center justify-between rounded-2xl border p-3 gap-2">
              <Label className="text-xs flex items-center gap-1"><ShieldAlert className="h-3.5 w-3.5 text-amber-600 shrink-0" /> تسليم تلقائي بعد (تحذيرات)</Label>
              <Input type="number" min={1} max={10} className="w-16 shrink-0" value={form.maxViolations} onChange={(e) => setForm({ ...form, maxViolations: e.target.value })} />
            </div>
            <div className="flex items-center justify-between rounded-2xl border p-3">
              <Label className="text-xs">ترتيب عشوائي للأسئلة</Label>
              <Switch checked={form.shuffleQuestions} onCheckedChange={(v) => setForm({ ...form, shuffleQuestions: v })} />
            </div>
            <div className="flex items-center justify-between rounded-2xl border p-3">
              <Label className="text-xs">عرض النتائج للطالب</Label>
              <Switch checked={form.showResults} onCheckedChange={(v) => setForm({ ...form, showResults: v })} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-teal-500/25 bg-teal-500/10 p-3">
            <Label className="text-xs font-bold">نشر الامتحان (يتاح للطلاب عبر اللينك)</Label>
            <Switch checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} />
          </div>
        </CardContent>
      </Card>

      {/* questions */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex-row items-center justify-between space-y-0 gap-2">
          <CardTitle className="text-lg">الأسئلة ({questions.length}) — الدرجات: {totalMarks}</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="font-bold" onClick={() => addQuestion("MCQ")}><Plus className="h-4 w-4 ml-1" /> اختيار متعدد</Button>
            <Button size="sm" variant="outline" className="font-bold" onClick={() => addQuestion("TRUE_FALSE")}><Plus className="h-4 w-4 ml-1" /> صح وخطأ</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.length === 0 && <p className="text-sm text-slate-400 text-center py-6">أضف الأسئلة — كل سؤال له درجة، والتصحيح تلقائي</p>}

          {questions.map((q, qi) => (
            <div key={qi} className="rounded-3xl border p-4 space-y-3 bg-white/50">
              <div className="flex items-center gap-2">
                <span className="glass-strong text-slate-800 text-xs font-extrabold w-7 h-7 rounded-xl flex items-center justify-center shrink-0">{qi + 1}</span>
                <Input
                  placeholder={`نص السؤال ${qi + 1}`}
                  value={q.text}
                  onChange={(e) => setQuestions((qs) => qs.map((x, i) => (i === qi ? { ...x, text: e.target.value } : x)))}
                  className="font-bold"
                />
                <Input
                  type="number" min={1} className="w-20 shrink-0" title="درجة السؤال"
                  value={q.marks} onChange={(e) => setQuestions((qs) => qs.map((x, i) => (i === qi ? { ...x, marks: Number(e.target.value) || 1 } : x)))}
                />
                <Button size="icon" variant="ghost" className="text-red-400 shrink-0" onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== qi))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {q.type === "MCQ" ? (
                <div className="grid sm:grid-cols-2 gap-2 pr-9">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button
                        type="button"
                        title="اضغط لتحديد الإجابة الصحيحة"
                        onClick={() => setQuestions((qs) => qs.map((x, i) => (i === qi ? { ...x, correct: opt } : x)))}
                        className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                          q.correct && q.correct === opt ? "border-emerald-500 bg-emerald-500" : "border-white/80 bg-white"
                        }`}
                      >
                        {q.correct && q.correct === opt && <CheckCircle2 className="h-4 w-4 text-white" />}
                      </button>
                      <Input
                        placeholder={`الاختيار ${oi + 1}`}
                        value={opt}
                        onChange={(e) => setQuestions((qs) => qs.map((x, i) => {
                          if (i !== qi) return x;
                          const opts = [...x.options];
                          const wasCorrect = x.correct === opts[oi];
                          opts[oi] = e.target.value;
                          return { ...x, options: opts, correct: wasCorrect ? e.target.value : x.correct };
                        }))}
                      />
                    </div>
                  ))}
                  <p className="text-[11px] text-slate-400 sm:col-span-2">اضغط على الدائرة لتحديد الإجابة الصحيحة ✓ (الحالي: <b>{q.correct || "لم يحدد!"}</b>)</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 pr-9">
                  {["صح", "خطأ"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setQuestions((qs) => qs.map((x, i) => (i === qi ? { ...x, correct: opt } : x)))}
                      className={`rounded-2xl border-2 px-6 py-2 font-bold text-sm transition-colors ${
                        q.correct === opt ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-white/70 bg-white text-slate-500"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* share link */}
      {initialExam && !isNew && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2">لينك الامتحان للطلاب</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 rounded-2xl border-2 border-teal-500/30 bg-teal-500/10 p-3">
              <Copy className="h-5 w-5 text-teal-600 shrink-0" />
              <p className="text-sm text-teal-900 truncate flex-1 font-mono" dir="ltr">{shareUrl}</p>
              <Button size="sm" className="bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25" onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("تم نسخ اللينك ✓"); }}>نسخ</Button>
              <Button size="sm" variant="outline" disabled={refreshLink.isPending} onClick={() => confirm("توليد لينك جديد يجعل القديم غير صالح، متأكد؟") && refreshLink.mutate()}>
                <RefreshCw className="h-4 w-4 ml-1" /> لينك جديد
              </Button>
            </div>
            <p className="text-xs text-slate-400">أرسل هذا اللينك للطلاب — يفتح الامتحان فقط في الفترة المحددة ولمحاولة واحدة</p>
          </CardContent>
        </Card>
      )}

      <div className="sticky bottom-4">
        <Button
          className="w-full h-12 font-extrabold text-base bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25 shadow-lg"
          disabled={!form.title.trim() || save.isPending}
          onClick={() => save.mutate()}
        >
          <Save className="h-5 w-5 ml-2" /> حفظ الامتحان {questions.length > 0 ? `(${questions.length} سؤال / ${totalMarks} درجة)` : ""}
        </Button>
      </div>

      {/* attempts & violations */}
      {initialExam && initialExam.attempts.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-teal-700" /> محاولات الطلاب ({initialExam.attempts.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {initialExam.attempts.map((a) => {
              const violationLog: { at: string; type: string }[] = JSON.parse(a.violations || "[]");
              return (
                <div key={a.id} className="rounded-2xl border border-white/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm text-slate-700">{a.user.name ?? a.user.email} <span className="text-slate-400 font-normal" dir="ltr">({a.user.email})</span></p>
                      <p className="text-xs text-slate-400">
                        بدأ: {fmtDate(a.startedAt)}
                        {a.finishedAt && <> • سلّم: {fmtDate(a.finishedAt)}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.violationCount > 0 && (
                        <Badge variant="destructive"><AlertTriangle className="h-3 w-3 ml-1" /> {a.violationCount} غش</Badge>
                      )}
                      {a.status === "IN_PROGRESS" ? (
                        <Badge className="bg-white/60 text-slate-700">جاري الحل</Badge>
                      ) : (
                        <Badge className={a.passed ? "bg-emerald-600" : "bg-red-500"}>
                          {a.percentage ?? 0}% {a.autoSubmitted ? "(تسليم تلقائي)" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {a.violationCount > 0 && violationLog.length > 0 && (
                    <div className="mt-3 rounded-xl bg-red-50 border border-red-100 p-2.5">
                      <p className="text-xs font-bold text-red-700 mb-1">سجل محاولات الغش:</p>
                      <ul className="text-xs text-red-600 space-y-0.5">
                        {violationLog.map((v, i) => (
                          <li key={i}>
                            {v.type === "TAB_SWITCH" ? "تبديل بين التبويبات" : v.type === "EXIT_FULLSCREEN" ? "الخروج من ملء الشاشة" : v.type === "WINDOW_BLUR" ? "ترك نافذة الامتحان" : v.type}
                            {" — "}{new Date(v.at).toLocaleTimeString("ar-EG")}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
