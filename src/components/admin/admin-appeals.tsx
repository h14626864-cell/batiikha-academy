"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPost, fmtDate } from "@/lib/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Gavel, CheckCircle2, XCircle, Loader2, Clock, MailQuestion } from "lucide-react";

type Appeal = {
  id: string;
  email: string;
  message: string;
  status: string; // PENDING | ACCEPTED | REJECTED
  createdAt: string;
  reviewedAt: string | null;
  user: { name?: string | null; image?: string | null; banned?: boolean } | null;
};

export default function AdminAppeals() {
  const qc = useQueryClient();
  const { data: appeals, isLoading } = useQuery<Appeal[]>({
    queryKey: ["admin-appeals"],
    queryFn: () => api("/api/admin/appeals"),
    refetchInterval: 15000,
  });

  const review = useMutation({
    mutationFn: ({ appealId, accept }: { appealId: string; accept: boolean }) =>
      apiPost("/api/admin/appeals", { appealId, accept }),
    onSuccess: (_d, vars) => {
      toast.success(vars.accept ? "تم قبول الطعن — الحظر اتشال والبريد اتحر" : "تم رفض الطعن");
      qc.invalidateQueries({ queryKey: ["admin-appeals"] });
      qc.invalidateQueries({ queryKey: ["admin-students"] });
      qc.invalidateQueries({ queryKey: ["admin-blocked"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-96 rounded-3xl" />;

  const pending = (appeals ?? []).filter((a) => a.status === "PENDING");
  const reviewed = (appeals ?? []).filter((a) => a.status !== "PENDING");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800">الطعون</h1>
        <p className="text-slate-500 text-sm mt-1">
          طلبات الطلاب المحظورين — لو قبلت طلب، الحظر بيتشال والبريد بيتحر تلقائيًا
        </p>
      </div>

      {/* pending first */}
      <h2 className="font-extrabold text-slate-700 mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-amber-500" /> قيد المراجعة ({pending.length})
      </h2>
      {pending.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-slate-400">
            <MailQuestion className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="font-semibold text-slate-500">مفيش طعون مستنية</p>
            <p className="text-xs mt-1">لما طالب محظور يبعت طلب، هيظهر هنا</p>
          </CardContent>
        </Card>
      )}
      <div className="space-y-3 mb-8">
        {pending.map((a) => (
          <Card key={a.id} className="border-0 shadow-sm border-r-4 !border-r-amber-400">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start gap-3">
                <Avatar className="h-11 w-11 border-2 border-white/60">
                  <AvatarImage src={a.user?.image ?? undefined} alt={a.user?.name ?? ""} />
                  <AvatarFallback className="bg-amber-500/15 text-amber-800 font-bold">
                    {(a.user?.name ?? a.email).slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-40">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-800">{a.user?.name ?? "حساب محذوف"}</p>
                    {a.user?.banned && <Badge variant="destructive">محظور حاليًا</Badge>}
                    <span className="text-[11px] text-slate-400">{fmtDate(a.createdAt)}</span>
                  </div>
                  <p className="text-xs text-slate-400" dir="ltr">{a.email}</p>
                  <p className="text-sm text-slate-700 bg-white/60 border rounded-2xl px-4 py-2.5 mt-2 leading-relaxed whitespace-pre-wrap">
                    {a.message}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 font-bold rounded-xl"
                    disabled={review.isPending}
                    onClick={() => review.mutate({ appealId: a.id, accept: true })}
                  >
                    {review.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 ml-1" />}
                    قبول
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-500 border-red-200 hover:bg-red-50 font-bold rounded-xl"
                    disabled={review.isPending}
                    onClick={() => review.mutate({ appealId: a.id, accept: false })}
                  >
                    <XCircle className="h-4 w-4 ml-1" />
                    رفض
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* reviewed history */}
      {reviewed.length > 0 && (
        <>
          <h2 className="font-extrabold text-slate-700 mb-3 flex items-center gap-2">
            <Gavel className="h-4 w-4 text-slate-400" /> تمت مراجعتها ({reviewed.length})
          </h2>
          <div className="space-y-2">
            {reviewed.map((a) => (
              <div key={a.id} className="rounded-2xl border bg-white/50 px-4 py-3 flex flex-wrap items-center gap-3">
                <Badge className={a.status === "ACCEPTED" ? "bg-emerald-600" : "bg-red-500"}>
                  {a.status === "ACCEPTED" ? "مقبول" : "مرفوض"}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-700">{a.user?.name ?? "حساب محذوف"}</p>
                  <p className="text-xs text-slate-400 truncate">{a.message}</p>
                </div>
                <span className="text-[11px] text-slate-400">رُوجع {fmtDate(a.reviewedAt)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
