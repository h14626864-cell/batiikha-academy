"use client";

import { useQuery } from "@tanstack/react-query";
import { api, fmtDate } from "@/lib/client";
import { useHashRoute } from "@/lib/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen, Trophy, Award, FileQuestion, ClipboardCheck, ChevronLeft,
  CheckCircle2, Flame, Target,
} from "lucide-react";

type Dash = {
  enrollments: { id: string; title: string; _count: { units: number; exams: number; assignments: number } }[];
  courseProgress: { courseId: string; total: number; done: number }[];
  attempts: { id: string; percentage: number | null; passed: boolean | null; exam: { title: string; course: { title: string } } }[];
  submissions: { id: string; status: string; score: number | null; assignment: { title: string; maxScore: number } }[];
  certificates: { id: string; title: string; serial: string; issuedAt: string }[];
  overall: { totalLessons: number; doneLessons: number };
};

export default function StudentDashboard() {
  const { navigate } = useHashRoute();
  const { data, isLoading } = useQuery<Dash>({ queryKey: ["student-dashboard"], queryFn: () => api("/api/student/dashboard") });
  const { data: leaderboard } = useQuery<{ id: string; name: string; total: number }[]>({
    queryKey: ["leaderboard"], queryFn: () => api("/api/leaderboard"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-3xl" />)}</div>
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }
  if (!data) return null;

  const overallPct = data.overall.totalLessons > 0 ? Math.round((data.overall.doneLessons / data.overall.totalLessons) * 100) : 0;
  const bestExam = data.attempts.reduce((m, a) => Math.max(m, a.percentage ?? 0), 0);

  const stats = [
    { icon: BookOpen, label: "كورساتي", value: data.enrollments.length, color: "bg-teal-500/10 text-teal-700" },
    { icon: CheckCircle2, label: "دروس مكتملة", value: data.overall.doneLessons, color: "bg-teal-500/10 text-teal-700" },
    { icon: FileQuestion, label: "أفضل نتيجة امتحان", value: `${bestExam}%`, color: "bg-teal-500/10 text-teal-700" },
    { icon: Award, label: "شهاداتي", value: data.certificates.length, color: "bg-teal-500/10 text-teal-700" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome hero */}
      <div className="hero-gradient rounded-3xl p-6 lg:p-8 text-white relative overflow-hidden">
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10">
          <p className="text-teal-100 text-sm font-medium">أهلًا بك مجددًا 👋</p>
          <h1 className="text-2xl lg:text-3xl font-extrabold mt-1">واصل تقدمك نحو التفوق</h1>
          <div className="mt-5 max-w-md">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-semibold">تقدمك العام في الدروس</span>
              <span className="font-extrabold">{overallPct}%</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${overallPct}%` }} />
            </div>
            <p className="text-teal-100 text-xs mt-2">{data.overall.doneLessons} من {data.overall.totalLessons} درس على مستوى المنصة</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-0 shadow-sm card-hover">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${s.color}`}><s.icon className="h-6 w-6" /></div>
              <div>
                <p className="text-2xl font-extrabold text-slate-800">{s.value}</p>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* My courses */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              كورساتي
              <Button variant="ghost" size="sm" onClick={() => navigate("#/courses")}>
                استعرض الكل <ChevronLeft className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.enrollments.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">لم تشترك في أي كورس بعد</p>
                <Button size="sm" className="mt-3 bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25" onClick={() => navigate("#/courses")}>
                  استعرض الكورسات
                </Button>
              </div>
            )}
            {data.enrollments.map((c) => {
              const p = data.courseProgress.find((cp) => cp.courseId === c.id);
              const pct = p && p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
              return (
                <button key={c.id} onClick={() => navigate(`#/course/${c.id}`)} className="w-full text-right rounded-2xl border border-white/60 p-4 hover:border-teal-500/30 hover:bg-teal-500/10 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-slate-800">{c.title}</p>
                    <Badge variant={pct === 100 ? "default" : "secondary"} className={pct === 100 ? "bg-emerald-600" : ""}>
                      {pct === 100 ? "مكتمل ✓" : `${pct}%`}
                    </Badge>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <p className="text-xs text-slate-400 mt-2">{c._count.units} وحدة • {c._count.exams} امتحان • {c._count.assignments} واجب</p>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Recent exam results */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-lg">آخر نتائج الامتحانات</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.attempts.length === 0 && <p className="text-sm text-slate-400 text-center py-4">لم تدخل أي امتحان بعد</p>}
              {data.attempts.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-2xl border border-white/60 p-3">
                  <div>
                    <p className="font-semibold text-sm text-slate-700">{a.exam.title}</p>
                    <p className="text-xs text-slate-400">{a.exam.course?.title ?? "امتحان مستقل"}</p>
                  </div>
                  <Badge className={a.passed ? "bg-emerald-600" : "bg-red-500"}>{a.percentage ?? 0}%</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Leaderboard preview */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-500" /> أعلى الطلاب</span>
                <Button variant="ghost" size="sm" onClick={() => navigate("#/leaderboard")}>الكل <ChevronLeft className="h-4 w-4" /></Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(leaderboard ?? []).slice(0, 5).map((l, i) => (
                <div key={l.id} className="flex items-center gap-3 py-2">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${
                    i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-amber-700 text-white" : "bg-white/60 text-slate-500"
                  }`}>{i + 1}</span>
                  <p className="text-sm font-semibold text-slate-700 flex-1">{l.name}</p>
                  <span className="text-xs font-bold text-teal-700">{l.total} نقطة</span>
                </div>
              ))}
              {(leaderboard ?? []).length === 0 && <p className="text-sm text-slate-400 text-center py-2">لا يوجد ترتيب بعد</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Certificates preview */}
      {data.certificates.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2"><Award className="h-5 w-5 text-amber-500" /> شهاداتي</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {data.certificates.map((c) => (
              <button key={c.id} onClick={() => navigate("#/certificates")} className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-right hover:border-amber-400 transition-colors">
                <p className="font-bold text-amber-900 text-sm">{c.title}</p>
                <p className="text-xs text-amber-600">صدرت في {fmtDate(c.issuedAt)}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
