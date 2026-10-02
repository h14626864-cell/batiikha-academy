"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, apiPost } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  ShieldAlert, Timer, ChevronRight, ChevronLeft, LogOut, Loader2,
  CheckCircle2, XCircle, AlertTriangle, Lock, ArrowRight,
} from "lucide-react";

type Q = { id: string; text: string; type: string; options: string[]; marks: number };
type PublicState =
  | { state: "READY"; exam: { id: string; title: string; description: string; durationMin: number; maxViolations: number; passScore: number; totalMarks: number; questionCount: number; courseTitle: string; openAt?: string; closeAt?: string } }
  | { state: "IN_PROGRESS"; exam: { id: string; title: string; durationMin: number; maxViolations: number; totalMarks: number; courseTitle: string }; attempt: { id: string; startedAt: string; violationCount: number }; deadline: string; questions: Q[]; savedAnswers: Record<string, string> }
  | { state: "FINISHED"; exam: { id: string; title: string; showResults: boolean; totalMarks: number }; attempt: { percentage: number | null; passed: boolean | null; score: number | null; autoSubmitted: boolean }; answers?: { questionId: string; text: string; options: string[]; correct: string; marks: number; given: string | null; isCorrect: boolean }[] }
  | { state: "NOT_OPEN"; exam?: { title?: string }; message?: string }
  | { state: "CLOSED"; exam?: { title?: string }; message?: string }
  | { state: "EXPIRED"; exam?: { title?: string }; message?: string };

type Violation = { at: string; type: string };

export default function ExamRunner({ token, navigateTo }: { token: string; navigateTo: (to: string) => void }) {
  const { data, refetch } = useQuery<PublicState>({
    queryKey: ["exam-public", token],
    queryFn: () => api(`/api/exam-public/${token}`),
    refetchOnWindowFocus: false,
  });

  if (!data) return <FullScreenCenter><Loader2 className="h-10 w-10 animate-spin text-teal-600" /></FullScreenCenter>;

  if (data.state === "NOT_OPEN") return <Gate icon="lock" title="الامتحان لم يفتح بعد" sub={data.message} onBack={() => navigateTo("#/exams")} />;
  if (data.state === "CLOSED") return <Gate icon="lock" title="الامتحان مقفل حاليًا" sub={data.message} onBack={() => navigateTo("#/exams")} />;
  if (data.state === "EXPIRED") return <Gate icon="timer" title="انتهى وقت الامتحان" sub={data.message} onBack={() => navigateTo("#/exams")} />;
  if (data.state === "FINISHED") return <ResultView data={data} onBack={() => navigateTo("#/exams")} />;
  if (data.state === "READY") return <ReadyView data={data} token={token} onStart={() => refetch()} />;
  return <TakingView token={token} data={data} navigateTo={navigateTo} />;
}

/* ---------- READY screen ---------- */
function ReadyView({ data, token, onStart }: { data: Extract<PublicState, { state: "READY" }>; token: string; onStart: () => void }) {
  const start = useMutation({
    mutationFn: () => apiPost(`/api/exams/attempt`, { token }),
    onSuccess: onStart,
    onError: (e: Error) => toast.error(e.message),
  });
  const e = data.exam;
  return (
    <FullScreenCenter>
      <Card className="w-full max-w-lg border-0 shadow-xl">
        <CardContent className="p-8 space-y-5 text-center">
          <div className="mx-auto w-16 h-16 rounded-3xl hero-gradient flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-white" />
          </div>
          <div>
            {e.courseTitle ? (
              <p className="text-sm text-teal-700 font-bold">{e.courseTitle}</p>
            ) : (
              <p className="text-sm text-teal-700 font-bold">امتحان مستقل</p>
            )}
            <h1 className="text-2xl font-extrabold text-slate-800">{e.title}</h1>
            {e.description && <p className="text-sm text-slate-500 mt-2">{e.description}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-white/50 p-3">
              <p className="text-xl font-extrabold text-slate-800">{e.questionCount}</p>
              <p className="text-xs text-slate-500">سؤال</p>
            </div>
            <div className="rounded-2xl bg-white/50 p-3">
              <p className="text-xl font-extrabold text-slate-800">{e.durationMin}</p>
              <p className="text-xs text-slate-500">دقيقة</p>
            </div>
            <div className="rounded-2xl bg-white/50 p-3">
              <p className="text-xl font-extrabold text-slate-800">{e.totalMarks}</p>
              <p className="text-xs text-slate-500">الدرجة الكلية</p>
            </div>
          </div>

          <Alert className="text-right border-amber-200 bg-amber-50">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-xs leading-relaxed">
              <b>نظام مكافحة الغش مفعّل:</b> سيُفتح الامتحان في وضع ملء الشاشة. الخروج من وضع ملء الشاشة أو التبديل بين النوافذ يُسجل كمحاولة غش،
              وبعد {e.maxViolations} مرات سيُسلَّم امتحانك تلقائيًا. النسخ واللصق ممنوع أيضًا.
            </AlertDescription>
          </Alert>

          <Button className="w-full h-12 font-bold text-base bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25" disabled={start.isPending} onClick={() => start.mutate()}>
            {start.isPending ? <Loader2 className="animate-spin h-5 w-5 ml-2" /> : null}
            ابدأ الامتحان الآن
          </Button>
          <p className="text-xs text-slate-400">بمجرد البدء لا يمكن إيقاف المؤقت</p>
        </CardContent>
      </Card>
    </FullScreenCenter>
  );
}

/* ---------- TAKING the exam ---------- */
function TakingView({ data, token: _token, navigateTo }: { data: Extract<PublicState, { state: "IN_PROGRESS" }>; token: string; navigateTo: (to: string) => void }) {
  const attemptId = data.attempt.id;
  const [answers, setAnswers] = useState<Record<string, string>>(data.savedAnswers ?? {});
  const [current, setCurrent] = useState(0);
  const [violationCount, setViolationCount] = useState(data.attempt.violationCount);
  const [showViolationWarning, setShowViolationWarning] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number>(Math.max(0, new Date(data.deadline).getTime() - Date.now()));
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);
  const lastViolationRef = useRef(0);

  const questions = data.questions;
  const q = questions[current];

  /* timer is registered after submitMutation below */

  const submitMutation = useMutation({
    mutationFn: (payload: { auto?: boolean }) =>
      apiPost<{ attempt: { percentage: number | null }; showResults: boolean }>(`/api/attempts/${attemptId}/submit`, { answers, ...payload }),
    onSuccess: () => {
      submittedRef.current = true;
      toast.success("تم تسليم الامتحان");
      navigateTo("#/exams");
      window.location.hash = "#/exams";
      window.location.reload();
    },
    onError: (e: Error) => {
      submittedRef.current = false;
      setSubmitting(false);
      toast.error(e.message);
    },
  });

  useEffect(() => {
    const t = setInterval(() => {
      const rem = Math.max(0, new Date(data.deadline).getTime() - Date.now());
      setRemaining(rem);
      if (rem <= 0 && !submittedRef.current) {
        submittedRef.current = true;
        submitMutation.mutate({ auto: true });
      }
    }, 1000);
    return () => clearInterval(t);
  }, [data.deadline]);

  const violationMutation = useMutation({
    mutationFn: (type: string) => apiPost<{ violationCount: number; maxViolations: number; autoSubmit: boolean }>(`/api/attempts/${attemptId}/violation`, { type }),
    onSuccess: (res) => {
      setViolationCount(res.violationCount);
      if (res.autoSubmit && !submittedRef.current) {
        submittedRef.current = true;
        toast.error("تم تسليم امتحانك تلقائيًا بسبب تجاوز الحد المسموح من محاولات الغش!");
        submitMutation.mutate({ auto: true });
      } else {
        setShowViolationWarning(`⚠️ محاولة غش #${res.violationCount} — بعد ${res.maxViolations} مرات سيُسلَّم امتحانك تلقائيًا!`);
        setTimeout(() => setShowViolationWarning(null), 5000);
      }
    },
  });

  const logViolation = useCallback((type: string) => {
    const now = Date.now();
    if (now - lastViolationRef.current < 1500 || submittedRef.current) return;
    lastViolationRef.current = now;
    violationMutation.mutate(type);
  }, []);

  /* anti-cheat listeners */
  useEffect(() => {
    const el = document.documentElement;
    el.requestFullscreen?.().catch(() => {});
    document.body.classList.add("exam-mode");

    const onVisibility = () => document.hidden && logViolation("TAB_SWITCH");
    const onBlur = () => logViolation("WINDOW_BLUR");
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && !submittedRef.current) logViolation("EXIT_FULLSCREEN");
    };
    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    const onCopy = (e: ClipboardEvent) => e.preventDefault();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F12" || (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) || (e.ctrlKey && ["c", "v", "u", "p"].includes(e.key.toLowerCase()))) {
        e.preventDefault();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    document.addEventListener("paste", onCopy);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.classList.remove("exam-mode");
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      document.removeEventListener("paste", onCopy);
      document.removeEventListener("keydown", onKeyDown);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const answeredCount = Object.values(answers).filter((v) => v !== null && v !== undefined && v !== "").length;
  const timeDanger = remaining < 2 * 60 * 1000;

  return (
    <div className="min-h-screen bg-white/60 flex flex-col" dir="rtl">
      {/* violation warning */}
      {showViolationWarning && (
        <div className="fixed top-4 inset-x-4 z-[60]">
          <Alert className="border-red-300 bg-red-50 shadow-lg">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 font-bold text-sm">{showViolationWarning}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* header: timer + progress */}
      <header className={`sticky top-0 z-50 border-b px-4 lg:px-8 h-16 flex items-center justify-between ${timeDanger ? "bg-red-600 border-red-700" : "bg-slate-900 border-slate-800"} text-white`}>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          <div>
            <p className="font-bold text-sm leading-tight">{data.exam.title}</p>
            <p className="text-[11px] opacity-70">وضع الامتحان الآمن — لا تغلق النافذة</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {violationCount > 0 && (
            <Badge className="bg-red-500 text-white border-0">{violationCount} تحذير غش</Badge>
          )}
          <div className={`flex items-center gap-2 rounded-2xl px-4 py-1.5 font-mono text-lg font-bold ${timeDanger ? "bg-white/20 animate-pulse" : "bg-white/10"}`} dir="ltr">
            <Timer className="h-5 w-5" />
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-3xl w-full mx-auto p-4 lg:p-8">
        <div className="mb-4 space-y-2">
          <div className="flex justify-between text-xs font-semibold text-slate-500">
            <span>سؤال {current + 1} من {questions.length}</span>
            <span>أجبت على {answeredCount} من {questions.length}</span>
          </div>
          <Progress value={((current + 1) / questions.length) * 100} className="h-2" />
        </div>

        {q && (
          <Card className="border-0 shadow-md">
            <CardContent className="p-6 lg:p-8 space-y-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg lg:text-xl font-bold text-slate-800 leading-relaxed">{q.text}</h2>
                <span className="shrink-0 rounded-xl bg-teal-500/10 text-teal-700 text-xs font-extrabold px-2.5 py-1">{q.marks} درجة</span>
              </div>

              <RadioGroup
                value={answers[q.id] ?? ""}
                onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                className="gap-3"
              >
                {q.options.map((opt, i) => (
                  <div key={i} className={`flex items-center gap-3 rounded-2xl border-2 p-4 cursor-pointer transition-colors ${
                    answers[q.id] === opt ? "border-teal-600 bg-teal-500/10" : "border-white/70 hover:border-teal-500/30"
                  }`} onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}>
                    <RadioGroupItem value={opt} id={`q-${q.id}-${i}`} />
                    <Label htmlFor={`q-${q.id}-${i}`} className="flex-1 cursor-pointer font-semibold text-slate-700 text-base">
                      {opt}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* navigation dots */}
        <div className="flex flex-wrap gap-2 justify-center mt-6">
          {questions.map((qq, i) => (
            <button
              key={qq.id}
              onClick={() => setCurrent(i)}
              className={`w-9 h-9 rounded-xl text-sm font-extrabold transition-colors ${
                i === current ? "bg-gradient-to-br from-teal-600 to-emerald-700 text-white" : answers[qq.id] ? "bg-teal-200 text-teal-900" : "bg-white text-slate-400 border"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mt-8 gap-3">
          <Button variant="outline" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)} className="font-bold">
            <ChevronRight className="h-4 w-4" /> السابق
          </Button>

          {current < questions.length - 1 ? (
            <Button onClick={() => setCurrent((c) => c + 1)} className="font-bold bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25">
              التالي <ChevronLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="font-bold bg-emerald-600 hover:bg-emerald-700"
              disabled={submitting}
              onClick={() => {
                if (answeredCount < questions.length && !confirm(`لديك ${questions.length - answeredCount} سؤال بدون إجابة. هل تريد التسليم على أي حال؟`)) return;
                setSubmitting(true);
                submitMutation.mutate({});
              }}
            >
              <CheckCircle2 className="h-4 w-4 ml-2" /> تسليم الامتحان
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- RESULT ---------- */
function ResultView({ data, onBack }: { data: Extract<PublicState, { state: "FINISHED" }>; onBack: () => void }) {
  const a = data.attempt;
  return (
    <FullScreenCenter>
      <Card className="w-full max-w-lg border-0 shadow-xl">
        <CardContent className="p-8 space-y-5 text-center">
          <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${a.passed ? "bg-emerald-100" : "bg-red-100"}`}>
            {a.passed ? <CheckCircle2 className="h-10 w-10 text-emerald-600" /> : <XCircle className="h-10 w-10 text-red-500" />}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">{a.passed ? "مبروك! ناجح 🎉" : "لم تحقق درجة النجاح"}</h1>
            <p className="text-slate-500 text-sm mt-1">{data.exam.title}</p>
          </div>

          {data.exam.showResults && (
            <>
              <div className="text-6xl font-black" dir="ltr">
                <span className={a.passed ? "text-emerald-600" : "text-red-500"}>{a.percentage ?? 0}%</span>
              </div>
              <p className="text-sm text-slate-500">الدرجة: {a.score ?? 0} من {data.exam.totalMarks}</p>
              {a.autoSubmitted && (
                <Alert className="text-right border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700 text-xs">تم تسليم امتحانك تلقائيًا بسبب محاولات غش متكررة</AlertDescription>
                </Alert>
              )}

              {data.answers && (
                <div className="text-right space-y-2 max-h-72 overflow-y-auto">
                  {data.answers.map((ans, i) => (
                    <div key={ans.questionId} className={`rounded-2xl border p-3 text-sm ${ans.isCorrect ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                      <p className="font-bold text-slate-700">{i + 1}. {ans.text}</p>
                      <p className="text-xs mt-1 text-slate-500">إجابتك: <b className={ans.isCorrect ? "text-emerald-700" : "text-red-600"}>{ans.given ?? "— بدون إجابة"}</b></p>
                      {!ans.isCorrect && <p className="text-xs text-slate-500">الصحيحة: <b className="text-emerald-700">{ans.correct}</b></p>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <Button onClick={onBack} className="w-full font-bold bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25">
            <LogOut className="h-4 w-4 ml-2" /> رجوع للامتحانات
          </Button>
        </CardContent>
      </Card>
    </FullScreenCenter>
  );
}

/* ---------- GATE (not open / closed / expired) ---------- */
function Gate({ title, sub, onBack, icon }: { title: string; sub?: string; onBack: () => void; icon: "lock" | "timer" }) {
  return (
    <FullScreenCenter>
      <Card className="w-full max-w-md border-0 shadow-xl">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
            {icon === "lock" ? <Lock className="h-8 w-8 text-amber-600" /> : <Timer className="h-8 w-8 text-amber-600" />}
          </div>
          <h1 className="text-xl font-extrabold text-slate-800">{title}</h1>
          {sub && <p className="text-sm text-slate-500">{sub}</p>}
          <Button onClick={onBack} variant="outline" className="font-bold">
            <ArrowRight className="h-4 w-4" /> رجوع
          </Button>
        </CardContent>
      </Card>
    </FullScreenCenter>
  );
}

function FullScreenCenter({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gradient-to-br from-slate-100 to-teal-50 flex items-center justify-center p-4" dir="rtl">{children}</div>;
}
