"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, Award, Flame, FileCheck2, BookCheck } from "lucide-react";

type Row = {
  id: string; name: string; email: string; image: string | null;
  lessonPoints: number; bestExam: number; assignAvg: number; certificates: number; total: number;
};

export default function LeaderboardView() {
  const { data: rows, isLoading } = useQuery<Row[]>({ queryKey: ["leaderboard"], queryFn: () => api("/api/leaderboard") });

  if (isLoading) return <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-3xl" />)}</div>;

  const medal = (i: number) =>
    i === 0 ? <Trophy className="h-6 w-6 text-amber-500" /> : i === 1 ? <Medal className="h-6 w-6 text-slate-400" /> : i === 2 ? <Medal className="h-6 w-6 text-amber-700" /> : null;

  return (
    <div>
      <div className="mb-6 text-center">
        <div className="inline-flex items-center gap-2 hero-gradient text-white rounded-3xl px-6 py-3">
          <Trophy className="h-6 w-6 text-amber-300" />
          <h1 className="text-xl font-extrabold">ترتيب أعلى 10 طلاب</h1>
        </div>
        <p className="text-slate-500 text-sm mt-2">النقاط = إكمال الدروس + أفضل نتيجة امتحان + متوسط درجات الواجبات</p>
      </div>

      <div className="space-y-3 max-w-3xl mx-auto">
        {(rows ?? []).length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>لا يوجد ترتيب بعد — ابدأ التعلم واجمع النقاط!</p>
          </div>
        )}

        {(rows ?? []).map((r, i) => (
          <Card key={r.id} className={`border-0 shadow-sm overflow-hidden ${i === 0 ? "ring-2 ring-amber-400" : ""}`}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 ${
                i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-amber-700 text-white" : "bg-white/60 text-slate-500"
              }`}>
                {i < 3 ? medal(i) ?? i + 1 : i + 1}
              </div>

              <Avatar className="h-11 w-11 border-2 border-teal-500/20">
                <AvatarImage src={r.image ?? undefined} alt={r.name} />
                <AvatarFallback className="bg-teal-500/15 text-teal-800 font-bold">{r.name.slice(0, 1)}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-slate-800 truncate">{r.name}</p>
                <div className="flex flex-wrap gap-x-3 text-xs text-slate-400 mt-0.5">
                  <span className="flex items-center gap-1"><BookCheck className="h-3 w-3" /> {r.lessonPoints} نقطة دروس</span>
                  <span className="flex items-center gap-1"><Flame className="h-3 w-3" /> أفضل امتحان {Math.round(r.bestExam)}%</span>
                  <span className="flex items-center gap-1"><Award className="h-3 w-3" /> {r.certificates} شهادة</span>
                </div>
              </div>

              <div className="text-left shrink-0">
                <p className="text-2xl font-black text-teal-700" dir="ltr">{r.total}</p>
                <p className="text-[10px] text-slate-400 font-bold">نقطة</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
