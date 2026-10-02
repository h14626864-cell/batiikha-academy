"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPost, fmtDate } from "@/lib/client";
import { useHashRoute } from "@/lib/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { BookOpen, Users, FileQuestion, ClipboardCheck, Play, Layers } from "lucide-react";

type Course = {
  id: string; title: string; description: string; isPublished: boolean;
  _count: { units: number; enrollments: number; exams: number; assignments: number };
};

export default function CoursesView() {
  const { navigate } = useHashRoute();
  const qc = useQueryClient();
  const { data: courses, isLoading } = useQuery<Course[]>({
    queryKey: ["public-courses"],
    queryFn: () => api<Course[]>("/api/courses/list"),
  });
  const { data: enrolledIds } = useQuery<string[]>({ queryKey: ["my-enrollments"], queryFn: () => api<string[]>("/api/enrollments") });

  const enroll = useMutation({
    mutationFn: (courseId: string) => apiPost("/api/enrollments", { courseId }),
    onSuccess: () => {
      toast.success("تم الاشتراك في الكورس بنجاح! 🎉");
      qc.invalidateQueries({ queryKey: ["my-enrollments"] });
      qc.invalidateQueries({ queryKey: ["student-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 rounded-3xl" />)}</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800">استعرض الكورسات</h1>
        <p className="text-slate-500 text-sm mt-1">اشترك في أي كورس وابدأ رحلة التعلم فورًا</p>
      </div>

      {(courses ?? []).length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>لا توجد كورسات منشورة حاليًا</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {(courses ?? []).map((c) => {
          const isEnrolled = (enrolledIds ?? []).includes(c.id);
          return (
            <Card key={c.id} className="border-0 shadow-sm overflow-hidden card-hover flex flex-col">
              <div className="h-36 hero-gradient relative flex items-center justify-center">
                <BookOpen className="h-12 w-12 text-white/80" />
                <Badge className="absolute top-3 left-3 bg-white/20 backdrop-blur text-white border-0">
                  <Layers className="h-3 w-3 ml-1" /> {c._count.units} وحدة
                </Badge>
              </div>
              <CardContent className="p-5 flex-1 flex flex-col">
                <h3 className="font-extrabold text-lg text-slate-800 mb-1">{c.title}</h3>
                <p className="text-sm text-slate-500 line-clamp-2 flex-1">{c.description || "كورس تعليمي على منصة بطيخه"}</p>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-3 mb-4">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {c._count.enrollments} طالب</span>
                  <span className="flex items-center gap-1"><FileQuestion className="h-3.5 w-3.5" /> {c._count.exams} امتحان</span>
                  <span className="flex items-center gap-1"><ClipboardCheck className="h-3.5 w-3.5" /> {c._count.assignments} واجب</span>
                </div>
                {isEnrolled ? (
                  <Button className="w-full bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25 font-bold" onClick={() => navigate(`#/course/${c.id}`)}>
                    <Play className="h-4 w-4 ml-2" /> تابع التعلم
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full font-bold border-teal-600 text-teal-700 hover:bg-teal-500/10"
                    disabled={enroll.isPending}
                    onClick={() => enroll.mutate(c.id)}
                  >
                    اشترك الآن — مجانًا
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
