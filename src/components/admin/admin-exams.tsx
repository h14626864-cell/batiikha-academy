"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiDelete, fmtDate } from "@/lib/client";
import { useHashRoute } from "@/lib/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, FileQuestion, Trash2, Settings2, Copy, Lock, Unlock, Users, Clock } from "lucide-react";

type ExamRow = {
  id: string; title: string; durationMin: number; openAt: string | null; closeAt: string | null;
  isPublished: boolean; accessToken: string; passScore: number;
  course: { title: string } | null;
  _count: { questions: number; attempts: number };
};

export default function AdminExams() {
  const { navigate } = useHashRoute();
  const qc = useQueryClient();

  const { data: exams, isLoading } = useQuery<ExamRow[]>({ queryKey: ["admin-exams"], queryFn: () => api("/api/exams") });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/exams/${id}`),
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["admin-exams"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="grid sm:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-44 rounded-3xl" />)}</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">الامتحانات</h1>
          <p className="text-slate-500 text-sm mt-1">أنشئ امتحانات بلينك خاص، مواعيد فتح وقفل، مدة محددة، ونظام مكافحة غش</p>
        </div>
        <Button className="bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25 font-bold" onClick={() => navigate("#/admin/exams/new")}>
          <Plus className="h-4 w-4 ml-1" /> امتحان جديد
        </Button>
      </div>

      {(exams ?? []).length === 0 && (
        <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-dashed">
          <FileQuestion className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-semibold">لا توجد امتحانات بعد</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-5">
        {(exams ?? []).map((e) => {
          const now = new Date();
          const notOpen = e.openAt && now < new Date(e.openAt);
          const closed = e.closeAt && now > new Date(e.closeAt);
          const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/#/exam/${e.accessToken}` : `/#/exam/${e.accessToken}`;

          return (
            <Card key={e.id} className="border-0 shadow-sm card-hover">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-teal-700 font-bold">{e.course ? e.course.title : "امتحان مستقل"}</p>
                    <h3 className="font-extrabold text-lg text-slate-800">{e.title}</h3>
                  </div>
                  {e.isPublished ? (
                    closed ? <Badge variant="destructive">مقفل الآن</Badge> : notOpen ? <Badge className="bg-amber-500">لم يفتح</Badge> : <Badge className="bg-emerald-600"><Unlock className="h-3 w-3 ml-1" /> مفتوح</Badge>
                  ) : (
                    <Badge variant="secondary"><Lock className="h-3 w-3 ml-1" /> مسودة</Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 font-medium">
                  <span className="flex items-center gap-1"><FileQuestion className="h-3.5 w-3.5" /> {e._count.questions} سؤال</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {e.durationMin} دقيقة</span>
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {e._count.attempts} محاولة</span>
                  <span>النجاح: {e.passScore}%</span>
                </div>

                <div className="text-xs text-slate-500 bg-white/50 rounded-2xl p-2.5 space-y-0.5">
                  <p>يفتح: {fmtDate(e.openAt)}</p>
                  <p>يقفل: {fmtDate(e.closeAt)}</p>
                </div>

                <div className="flex items-center gap-2 rounded-2xl border border-dashed border-teal-500/30 bg-teal-500/10 p-2">
                  <Copy className="h-4 w-4 text-teal-600 shrink-0" />
                  <p className="text-xs text-teal-800 truncate flex-1 font-mono" dir="ltr">{shareUrl}</p>
                  <Button size="sm" variant="ghost" className="h-7 text-teal-700 text-xs font-bold" onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("تم نسخ لينك الامتحان ✓"); }}>
                    نسخ
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25 font-bold" onClick={() => navigate(`#/admin/exams/${e.id}`)}>
                    <Settings2 className="h-4 w-4 ml-1" /> إدارة
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-500" onClick={() => confirm(`حذف الامتحان "${e.title}"؟`) && remove.mutate(e.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
