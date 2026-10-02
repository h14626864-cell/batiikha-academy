"use client";

import { useQuery } from "@tanstack/react-query";
import { api, fmtDate } from "@/lib/client";
import { useHashRoute } from "@/lib/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users, BookOpen, FileQuestion, ClipboardCheck, Award, Trophy,
  Activity, AlertTriangle, GraduationCap, MessagesSquare,
} from "lucide-react";

type Stats = {
  stats: { students: number; admins: number; courses: number; lessons: number; exams: number; assignments: number; attempts: number; submissions: number; certificates: number; posts: number };
  recentAttempts: { id: string; percentage: number | null; passed: boolean | null; finishedAt: string; user: { name: string | null; email: string }; exam: { title: string } }[];
  topStudents: { id: string; name: string; image: string | null; points: number }[];
};

export default function AdminDashboard() {
  const { navigate } = useHashRoute();
  const { data, isLoading } = useQuery<Stats>({ queryKey: ["admin-stats"], queryFn: () => api("/api/admin/stats") });

  if (isLoading || !data) return <div className="space-y-4"><Skeleton className="h-32 rounded-3xl" /><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 rounded-3xl" />)}</div></div>;

  const s = data.stats;
  const cards = [
    { icon: Users, label: "طلاب", value: s.students, color: "bg-teal-500/10 text-teal-700", hash: "#/admin/students" },
    { icon: BookOpen, label: "كورسات", value: s.courses, color: "bg-teal-500/10 text-teal-700", hash: "#/admin/courses" },
    { icon: GraduationCap, label: "دروس", value: s.lessons, color: "bg-teal-500/10 text-teal-700", hash: "#/admin/courses" },
    { icon: FileQuestion, label: "امتحانات", value: s.exams, color: "bg-teal-500/10 text-teal-700", hash: "#/admin/exams" },
    { icon: ClipboardCheck, label: "واجبات", value: s.assignments, color: "bg-teal-500/10 text-teal-700", hash: "#/admin/assignments" },
    { icon: Activity, label: "محاولات امتحان", value: s.attempts, color: "bg-teal-500/10 text-teal-700", hash: "#/admin/exams" },
    { icon: Award, label: "شهادات مصدرة", value: s.certificates, color: "bg-teal-500/10 text-teal-700", hash: "#/admin/certificates" },
    { icon: MessagesSquare, label: "مشاركات المجتمع", value: s.posts, color: "bg-teal-500/10 text-teal-700", hash: "#/admin/students" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">نظرة عامة</h1>
        <p className="text-slate-500 text-sm mt-1">كل ما يحدث في منصتك في لمحة</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <button key={c.label} onClick={() => navigate(c.hash)} className="text-right">
            <Card className="border-0 shadow-sm card-hover h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${c.color}`}><c.icon className="h-6 w-6" /></div>
                <div>
                  <p className="text-2xl font-extrabold text-slate-800">{c.value}</p>
                  <p className="text-xs text-slate-500 font-medium">{c.label}</p>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><Activity className="h-5 w-5 text-teal-700" /> آخر نتائج الامتحانات</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.recentAttempts.length === 0 && <p className="text-sm text-slate-400 text-center py-4">لا توجد محاولات بعد</p>}
            {data.recentAttempts.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-2xl border border-white/60 p-3">
                <div>
                  <p className="text-sm font-bold text-slate-700">{a.user.name ?? a.user.email}</p>
                  <p className="text-xs text-slate-400">{a.exam.title} • {fmtDate(a.finishedAt)}</p>
                </div>
                <Badge className={a.passed ? "bg-emerald-600" : "bg-red-500"}>{a.percentage ?? 0}%</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-500" /> أعلى الطلاب حاليًا</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.topStudents.length === 0 && <p className="text-sm text-slate-400 text-center py-4">لا يوجد طلاب بعد</p>}
            {data.topStudents.map((u, i) => (
              <div key={u.id} className="flex items-center gap-3 py-1.5">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${
                  i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-amber-700 text-white" : "bg-white/60 text-slate-500"
                }`}>{i + 1}</span>
                <Avatar className="h-8 w-8"><AvatarImage src={u.image ?? undefined} alt="" /><AvatarFallback className="bg-teal-500/15 text-teal-800 text-xs">{u.name.slice(0, 1)}</AvatarFallback></Avatar>
                <p className="text-sm font-semibold text-slate-700 flex-1">{u.name}</p>
                <span className="text-xs font-extrabold text-teal-700">{Math.round(u.points)} نقطة</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
