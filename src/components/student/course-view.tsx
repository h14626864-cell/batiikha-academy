"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPost, youtubeId, LESSON_TYPE_LABEL } from "@/lib/client";
import { useHashRoute } from "@/lib/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowRight, PlayCircle, FileText, Image as ImageIcon, Type, CheckCircle2,
  FileQuestion, ClipboardCheck, Award, Download, MonitorPlay,
} from "lucide-react";

type Lesson = { id: string; title: string; type: string; content: string; order: number };
type Unit = { id: string; title: string; lessons: Lesson[] };
type CourseData = {
  id: string; title: string; description: string; certRule: string;
  units: Unit[];
  exams: { id: string; title: string; isPublished: boolean }[];
  assignments: { id: string; title: string; isPublished: boolean }[];
  enrolled: boolean;
  completedLessonIds: string[];
  _count: { enrollments: number };
};

const TYPE_ICON: Record<string, typeof PlayCircle> = {
  VIDEO: PlayCircle, PDF: FileText, TEXT: Type, IMAGE: ImageIcon,
};

export default function CourseView({ courseId }: { courseId: string }) {
  const { navigate } = useHashRoute();
  const qc = useQueryClient();
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  const { data: course, isLoading } = useQuery<CourseData>({
    queryKey: ["course", courseId],
    queryFn: () => api<CourseData>(`/api/courses/${courseId}`),
  });

  const completeLesson = useMutation({
    mutationFn: (lessonId: string) => apiPost<{ ok: boolean; certificateIssued: boolean }>("/api/progress", { lessonId }),
    onSuccess: (res) => {
      toast.success("تم إنهاء الدرس ✓");
      if (res.certificateIssued) {
        toast.success("🎓 مبروك! حصلت على شهادة إتمام هذا الكورس!", { duration: 6000 });
      }
      qc.invalidateQueries({ queryKey: ["course", courseId] });
      qc.invalidateQueries({ queryKey: ["student-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-48 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></div>;
  if (!course) return <p className="text-center text-slate-400 py-20">الكورس غير موجود</p>;

  const allLessons = course.units.flatMap((u) => u.lessons);
  const doneCount = allLessons.filter((l) => course.completedLessonIds.includes(l.id)).length;
  const pct = allLessons.length > 0 ? Math.round((doneCount / allLessons.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("#/courses")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-teal-700 font-semibold">
        <ArrowRight className="h-4 w-4" /> رجوع للكورسات
      </button>

      {/* Header */}
      <div className="hero-gradient rounded-3xl p-6 lg:p-8 text-white relative overflow-hidden">
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10">
          <h1 className="text-2xl lg:text-3xl font-extrabold">{course.title}</h1>
          <p className="text-teal-100 mt-2 max-w-2xl text-sm leading-relaxed">{course.description || "ابدأ رحلتك التعليمية في هذا الكورس"}</p>
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <Badge className="bg-white/20 text-white border-0 backdrop-blur">{allLessons.length} درس</Badge>
            <Badge className="bg-white/20 text-white border-0 backdrop-blur">{course.units.length} وحدة</Badge>
            {course.exams.length > 0 && <Badge className="bg-white/20 text-white border-0 backdrop-blur">{course.exams.length} امتحان</Badge>}
            {course.assignments.length > 0 && <Badge className="bg-white/20 text-white border-0 backdrop-blur">{course.assignments.length} واجب</Badge>}
            {course.certRule !== "NONE" && (
              <Badge className="bg-amber-400 text-amber-950 border-0"><Award className="h-3 w-3 ml-1" /> شهادة إتمام</Badge>
            )}
          </div>
          <div className="mt-5 max-w-sm">
            <div className="flex justify-between text-xs mb-1.5">
              <span>تقدمك: {doneCount} / {allLessons.length} درس</span>
              <span className="font-bold">{pct}%</span>
            </div>
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Units & lessons */}
        <div className="space-y-4">
          {course.units.length === 0 && (
            <Card className="border-0 shadow-sm"><CardContent className="p-10 text-center text-slate-400 text-sm">لا توجد وحدات بعد — المحتوى قيد الإعداد</CardContent></Card>
          )}
          {course.units.map((u, ui) => (
            <Card key={u.id} className="border-0 shadow-sm overflow-hidden">
              <CardHeader className="bg-white/50 py-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white text-xs font-extrabold w-7 h-7 rounded-xl flex items-center justify-center">{ui + 1}</span>
                  {u.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {u.lessons.length === 0 && <p className="text-xs text-slate-400 p-4">لا توجد دروس في هذه الوحدة</p>}
                {u.lessons.map((l, li) => {
                  const done = course.completedLessonIds.includes(l.id);
                  const Icon = TYPE_ICON[l.type] ?? Type;
                  return (
                    <button
                      key={l.id}
                      onClick={() => setActiveLesson(l)}
                      className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-right transition-colors ${
                        activeLesson?.id === l.id ? "bg-teal-500/10 border border-teal-500/25" : "hover:bg-white/50 border border-transparent"
                      }`}
                    >
                      <span className={`p-2 rounded-xl ${done ? "bg-emerald-100 text-emerald-600" : "bg-white/60 text-slate-500"}`}>
                        {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm truncate ${done ? "text-emerald-700" : "text-slate-700"}`}>{l.title}</p>
                        <p className="text-xs text-slate-400">{LESSON_TYPE_LABEL[l.type] ?? l.type} • الدرس {li + 1}</p>
                      </div>
                      <PlayCircle className="h-5 w-5 text-teal-600 shrink-0" />
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Side: exams & assignments */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileQuestion className="h-5 w-5 text-teal-700" /> امتحانات الكورس</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {course.exams.length === 0 && <p className="text-xs text-slate-400">لا توجد امتحانات</p>}
              {course.exams.map((e) => (
                <button key={e.id} onClick={() => navigate("#/exams")} className="w-full text-right rounded-2xl border border-white/60 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:border-teal-500/30 hover:bg-teal-500/10">
                  {e.title}
                </button>
              ))}
              <p className="text-[11px] text-slate-400">ادخل من صفحة الامتحانات أو من لينك الامتحان</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-teal-700" /> واجبات الكورس</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {course.assignments.length === 0 && <p className="text-xs text-slate-400">لا توجد واجبات</p>}
              {course.assignments.map((a) => (
                <button key={a.id} onClick={() => navigate("#/assignments")} className="w-full text-right rounded-2xl border border-white/60 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:border-teal-500/30 hover:bg-teal-500/10">
                  {a.title}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lesson player dialog */}
      <Dialog open={!!activeLesson} onOpenChange={(open) => !open && setActiveLesson(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          {activeLesson && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <MonitorPlay className="h-5 w-5 text-teal-700" /> {activeLesson.title}
                </DialogTitle>
              </DialogHeader>

              <LessonContent lesson={activeLesson} />

              <div className="flex items-center justify-between pt-3 border-t">
                <p className="text-xs text-slate-400">
                  {course.completedLessonIds.includes(activeLesson.id) ? "أنهيت هذا الدرس ✓" : "شاهد / اقرأ الدرس بالكامل ثم اضغط إنهاء"}
                </p>
                <Button
                  className="bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25 font-bold"
                  disabled={completeLesson.isPending || course.completedLessonIds.includes(activeLesson.id)}
                  onClick={() => completeLesson.mutate(activeLesson.id)}
                >
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                  {course.completedLessonIds.includes(activeLesson.id) ? "تم ✓" : "إنهاء الدرس"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LessonContent({ lesson }: { lesson: Lesson }) {
  if (lesson.type === "VIDEO") {
    const vid = youtubeId(lesson.content);
    return vid ? (
      <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${vid}?rel=0`}
          title={lesson.title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    ) : (
      <p className="text-red-500 text-sm">رابط يوتيوب غير صالح</p>
    );
  }
  if (lesson.type === "PDF") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-2xl bg-white/50 p-3">
          <p className="text-sm font-semibold text-slate-600">ملف PDF</p>
          <a href={lesson.content} target="_blank" rel="noreferrer" className="text-sm font-bold text-teal-700 hover:underline flex items-center gap-1">
            <Download className="h-4 w-4" /> فتح / تحميل
          </a>
        </div>
        <iframe src={lesson.content} title={lesson.title} className="w-full h-[60vh] rounded-2xl border" />
      </div>
    );
  }
  if (lesson.type === "IMAGE") {
    return <img src={lesson.content} alt={lesson.title} className="w-full rounded-2xl border" />;
  }
  return (
    <div className="prose prose-sm max-w-none text-slate-700 leading-8 whitespace-pre-wrap bg-white/50 rounded-2xl p-5">
      {lesson.content || "لا يوجد محتوى"}
    </div>
  );
}
