"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPost, fmtDate, useHashRoute } from "@/lib/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowRight, FileQuestion, Lock, Unlock, Clock, ShieldAlert, Trophy, Eye } from "lucide-react";

type ExamRow = {
  id: string; title: string; description: string; durationMin: number; openAt: string | null; closeAt: string | null;
  isPublished: boolean; accessToken: string; passScore: number;
  course: { title: string } | null;
  _count: { questions: number; attempts: number };
  attempts: { id: string; status: string; percentage: number | null; passed: boolean | null }[];
};

export default function ExamsView() {
  const { navigate } = useHashRoute();
  const qc = useQueryClient();
  const { data: exams, isLoading } = useQuery<ExamRow[]>({ queryKey: ["student-exams"], queryFn: () => api("/api/exams") });

  const start = useMutation({
    mutationFn: (token: string) => apiPost("/api/exams/attempt", { token }),
    onSuccess: () => {
      qc.clear();
      navigate(`#/exams`);
      window.location.hash = "#/exams";
      // open the exam runner via the exam token route
      const token = exams?.[0]?.accessToken;
      if (token) window.location.hash = `#/exam/${token}`;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="grid sm:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-52 rounded-3xl" />)}</div>;

  function enterExam(e: ExamRow) {
    navigate(`#/exam/${e.accessToken}`);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800">الامتحانات</h1>
        <p className="text-slate-500 text-sm mt-1">امتحانات مؤقتة وآمنة — ركز جيدًا وعدم الخروج أثناء الامتحان يُحتسب عليك</p>
      </div>

      {(exams ?? []).length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <FileQuestion className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>لا توجد امتحانات متاحة حاليًا</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-5">
        {(exams ?? []).map((e) => {
          const now = new Date();
          const notOpen = e.openAt && now < new Date(e.openAt);
          const closed = e.closeAt && now > new Date(e.closeAt);
          const attempted = e.attempts.length > 0;
          const finished = e.attempts.some((a) => a.status !== "IN_PROGRESS");

          return (
            <Card key={e.id} className="border-0 shadow-sm card-hover">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-teal-700 font-bold">{e.course ? e.course.title : "امتحان مستقل"}</p>
                    <h3 className="font-extrabold text-lg text-slate-800">{e.title}</h3>
                  </div>
                  {finished ? (
                    <Badge className="bg-slate-600 shrink-0">تم التسليم</Badge>
                  ) : closed ? (
                    <Badge variant="destructive" className="shrink-0">مقفل</Badge>
                  ) : notOpen ? (
                    <Badge className="bg-amber-500 shrink-0"><Lock className="h-3 w-3 ml-1" /> لم يفتح</Badge>
                  ) : (
                    <Badge className="bg-emerald-600 shrink-0"><Unlock className="h-3 w-3 ml-1" /> متاح الآن</Badge>
                  )}
                </div>

                {e.description && <p className="text-sm text-slate-500 line-clamp-2">{e.description}</p>}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 font-medium">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {e.durationMin} دقيقة</span>
                  <span className="flex items-center gap-1"><FileQuestion className="h-3.5 w-3.5" /> {e._count.questions} سؤال</span>
                  <span className="flex items-center gap-1"><ShieldAlert className="h-3.5 w-3.5" /> النجاح من {e.passScore}%</span>
                </div>

                <div className="text-xs text-slate-500 space-y-0.5 bg-white/50 rounded-2xl p-3">
                  <p>يفتح: {fmtDate(e.openAt)}</p>
                  <p>يقفل: {fmtDate(e.closeAt)}</p>
                </div>

                {finished && e.attempts[0] ? (
                  <div className="flex items-center justify-between rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Trophy className={`h-5 w-5 ${e.attempts[0].passed ? "text-emerald-600" : "text-red-500"}`} />
                      <div>
                        <p className="text-sm font-extrabold text-emerald-800">نتيجتك: {e.attempts[0].percentage ?? 0}%</p>
                        <p className="text-xs text-emerald-600">{e.attempts[0].passed ? "ناجح — مبروك! 🎉" : "لم تحقق درجة النجاح"}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => enterExam(e)}>
                      <Eye className="h-4 w-4 ml-1" /> التفاصيل
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full font-bold bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25"
                    disabled={notOpen || closed || start.isPending}
                    onClick={() => enterExam(e)}
                  >
                    {notOpen ? `يفتح في ${fmtDate(e.openAt)}` : closed ? "انتهت فترة الامتحان" : attempted ? "استكمال الامتحان" : "دخول الامتحان"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
