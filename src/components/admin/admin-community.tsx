"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPost, apiDelete, fmtDate } from "@/lib/client";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Users, Loader2, Trash2, ShieldCheck, MessageCircle, Lock, LockOpen, ShieldAlert,
} from "lucide-react";

type Author = { id: string; name: string | null; image: string | null; role: string };
type Post = {
  id: string; title: string; content: string; createdAt: string; user: Author;
  _count: { comments: number };
  comments: { id: string; content: string; createdAt: string; user: Author }[];
};

export default function AdminCommunity() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const [confirmLock, setConfirmLock] = useState(false);

  const { data: settings } = useQuery<{ locked: boolean }>({
    queryKey: ["community-settings"],
    queryFn: () => api("/api/community/settings"),
  });

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["community-feed"],
    queryFn: async () => {
      const list = await api<Post[]>("/api/community");
      return list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    },
    refetchInterval: 8000,
  });

  const locked = settings?.locked ?? false;
  const myId = (session?.user as { id?: string })?.id;

  const toggleLock = useMutation({
    mutationFn: (next: boolean) => apiPost("/api/community/settings", { locked: next }),
    onSuccess: (_d, next) => {
      toast.success(next ? "تم قفل الشات — الطلاب مش هيقدروا يكتبوا" : "تم فتح الشات للكل");
      setConfirmLock(false);
      qc.invalidateQueries({ queryKey: ["community-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removePost = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/community?id=${id}`),
    onSuccess: () => { toast.success("تم حذف الرسالة"); qc.invalidateQueries({ queryKey: ["community-feed"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeComment = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/community/comments?id=${id}`),
    onSuccess: () => { toast.success("تم حذف الرد"); qc.invalidateQueries({ queryKey: ["community-feed"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalMessages = (posts ?? []).reduce((n, p) => n + 1 + p.comments.length, 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">المجتمع</h1>
          <p className="text-slate-500 text-sm mt-1">شوف كل الرسائل، امسح أي رسالة مخالفة، وقم أو افتح الشات للكل</p>
        </div>
        <Button
          variant={locked ? "default" : "outline"}
          className={`rounded-2xl font-bold ${locked ? "bg-emerald-600 hover:bg-emerald-700" : "text-red-600 border-red-200 hover:bg-red-50"}`}
          disabled={toggleLock.isPending}
          onClick={() => setConfirmLock(true)}
        >
          {locked ? <LockOpen className="h-4 w-4 ml-1.5" /> : <Lock className="h-4 w-4 ml-1.5" />}
          {locked ? "فتح الشات للكل" : "قفل الشات"}
        </Button>
      </div>

      {/* status strip */}
      <div className={`rounded-2xl border px-4 py-3 mb-5 flex flex-wrap items-center gap-3 ${locked ? "bg-red-500/10 border-red-500/25" : "bg-emerald-500/10 border-emerald-500/25"}`}>
        {locked ? <Lock className="h-5 w-5 text-red-500" /> : <ShieldCheck className="h-5 w-5 text-emerald-600" />}
        <p className={`text-sm font-bold ${locked ? "text-red-600" : "text-emerald-700"}`}>
          {locked
            ? "الشات مقفول — الطلاب شايفين الرسائل بس مش بيقدروا يكتبوا (وأنت تقدر تكتب إعلانات)"
            : "الشات مفتوح — كل الطلاب يقدروا يكتبوا ويردوا"}
        </p>
        <Badge variant="secondary" className="mr-auto font-bold">{totalMessages} رسالة</Badge>
      </div>

      {confirmLock && (
        <Card className="border-0 shadow-sm mb-5 border-r-4 !border-r-amber-400">
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-sm font-bold text-slate-700 flex-1 min-w-48">
              {locked ? "متأكد إنك عايز تفتح الشات للطلاب تاني؟" : "متأكد إنك عايز تقفل الشات؟ الطلاب هيشوفوا رسالة إغلاق ومش هيقدروا يكتبوا."}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className={`rounded-xl font-bold ${locked ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-500 hover:bg-red-600"}`}
                disabled={toggleLock.isPending}
                onClick={() => toggleLock.mutate(!locked)}
              >
                {toggleLock.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "تأكيد"}
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl font-bold" onClick={() => setConfirmLock(false)}>
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* feed — newest first, admin moderation view */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-3xl" />)}</div>
      ) : (posts ?? []).length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-10 text-center text-slate-400">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-slate-500">مفيش رسايل في المجتمع لسه</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(posts ?? []).map((p) => (
            <Card key={p.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={p.user?.image ?? undefined} alt={p.user?.name ?? ""} />
                    <AvatarFallback className="bg-teal-500/10 text-teal-800 font-bold text-sm">{(p.user?.name ?? "ط").slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-slate-800">{p.user?.name ?? "طالب"}</span>
                      {p.user?.role === "ADMIN" && (
                        <Badge className="bg-teal-500/10 text-teal-700 border border-teal-500/20 text-[10px] px-1.5 py-0">
                          <ShieldCheck className="h-3 w-3 ml-0.5" /> إدارة
                        </Badge>
                      )}
                      {p.user?.id === myId && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">أنت</Badge>}
                      <span className="text-[10px] text-slate-400">{fmtDate(p.createdAt)}</span>
                      <button
                        onClick={() => confirm("حذف الرسالة دي وكل ردودها؟") && removePost.mutate(p.id)}
                        className="mr-auto text-slate-300 hover:text-red-500 transition-colors"
                        aria-label="حذف الرسالة"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm text-slate-700 leading-6 whitespace-pre-wrap break-words mt-1">{p.content}</p>

                    {/* replies */}
                    {p.comments.length > 0 && (
                      <div className="mt-3 space-y-2 mr-5">
                        {p.comments.map((c) => (
                          <div key={c.id} className="rounded-2xl bg-teal-500/5 border border-teal-500/15 px-3.5 py-2.5 flex items-start gap-2.5">
                            <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                              <AvatarImage src={c.user?.image ?? undefined} alt="" />
                              <AvatarFallback className="bg-white/60 text-slate-600 text-[10px]">{(c.user?.name ?? "ط").slice(0, 1)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                                {c.user?.name ?? "طالب"}
                                {c.user?.role === "ADMIN" && <ShieldCheck className="h-3 w-3 text-teal-600" />}
                                <span className="font-normal text-slate-400">• {fmtDate(c.createdAt)}</span>
                                <button
                                  onClick={() => confirm("حذف الرد ده؟") && removeComment.mutate(c.id)}
                                  className="mr-auto text-slate-300 hover:text-red-500 transition-colors"
                                  aria-label="حذف الرد"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </p>
                              <p className="text-xs text-slate-600 leading-5 whitespace-pre-wrap break-words mt-0.5">{c.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* decorative footer count */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mt-6">
        <Users className="h-3.5 w-3.5" />
        بيتم تحديث الرسايل تلقائيًا كل 8 ثواني
      </div>
    </div>
  );
}
