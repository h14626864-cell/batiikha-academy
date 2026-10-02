"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPost, apiPatch, apiDelete, fmtDate } from "@/lib/client";
import { useHashRoute } from "@/lib/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowRight as ArrowRightIcon } from "lucide-react";
import {
  ShieldCheck, User, Trash2, Award, BookOpen, FileQuestion,
  ClipboardCheck, AlertTriangle, GraduationCap, Loader2, Ban, ShieldOff,
} from "lucide-react";

type Row = {
  id: string; name: string | null; email: string; image: string | null; role: string; createdAt: string;
  banned?: boolean; banReason?: string | null; banUntil?: string | null;
  summary: { enrolled: number; lessonsDone: number; examsTaken: number; avgScore: number | null; violations: number; assignmentsSubmitted: number; assignmentsGraded: number; certificates: number };
};

type Detail = {
  user: { id: string; name: string | null; email: string; image: string | null; role: string; createdAt: string };
  enrollments: { id: string; course: { id: string; title: string } }[];
  lessonProgress: { id: string; completedAt: string; lesson: { id: string; title: string; unit: { title: string; course: { title: string } } } }[];
  attempts: { id: string; percentage: number | null; passed: boolean | null; violationCount: number; status: string; startedAt: string; exam: { id: string; title: string } }[];
  submissions: { id: string; status: string; score: number | null; submittedAt: string; assignment: { id: string; title: string; maxScore: number } }[];
  certificates: { id: string; title: string; serial: string; issuedAt: string }[];
};

type Blocked = {
  id: string; email: string; name?: string | null; blockedAt: string;
};

export default function AdminStudents({ studentId }: { studentId?: string }) {
  if (studentId) return <StudentDetail studentId={studentId} />;
  return <StudentsList />;
}

function StudentsList() {
  const { navigate } = useHashRoute();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  // ban dialog state
  const [banTarget, setBanTarget] = useState<Row | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banDays, setBanDays] = useState("0");

  const { data: users, isLoading } = useQuery<Row[]>({ queryKey: ["admin-students"], queryFn: () => api("/api/admin/students") });
  const { data: blocked } = useQuery<Blocked[]>({ queryKey: ["admin-blocked"], queryFn: () => api("/api/admin/blocked") });

  const setRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => apiPatch("/api/admin/students", { userId, role }),
    onSuccess: () => { toast.success("تم تغيير الصلاحية ✓"); qc.invalidateQueries({ queryKey: ["admin-students"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeUser = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/students?id=${id}`),
    onSuccess: () => {
      toast.success("تم حذف الحساب وحظر بريده من التسجيل مجددًا");
      qc.invalidateQueries({ queryKey: ["admin-students"] });
      qc.invalidateQueries({ queryKey: ["admin-blocked"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unblock = useMutation({
    mutationFn: (email: string) => apiDelete(`/api/admin/blocked?email=${encodeURIComponent(email)}`),
    onSuccess: () => {
      toast.success("تم فك الحظر — يقدر يسجل من تاني الآن");
      qc.invalidateQueries({ queryKey: ["admin-blocked"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const banUser = useMutation({
    mutationFn: ({ userId, reason, days }: { userId: string; reason: string; days: number }) =>
      apiPost("/api/admin/ban", { userId, reason, days: days > 0 ? days : undefined }),
    onSuccess: () => {
      toast.success("تم حظر الحساب — مش هيقدر يسجل دخول تاني");
      setBanTarget(null); setBanReason(""); setBanDays("0");
      qc.invalidateQueries({ queryKey: ["admin-students"] });
      qc.invalidateQueries({ queryKey: ["admin-appeals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unbanUser = useMutation({
    mutationFn: (userId: string) => apiDelete(`/api/admin/ban?userId=${userId}`),
    onSuccess: () => {
      toast.success("تم فك الحظر — الحساب رجع يشتغل عادي");
      qc.invalidateQueries({ queryKey: ["admin-students"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-96 rounded-3xl" />;

  const filtered = (users ?? []).filter((u) =>
    (u.name ?? "").includes(search) || u.email.includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">الطلاب والمتابعة</h1>
          <p className="text-slate-500 text-sm mt-1">متابعة تقدم كل طالب، إدارة الصلاحيات، وكشف محاولات الغش</p>
        </div>
        <Input placeholder="بحث بالاسم أو البريد..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
      </div>

      <div className="space-y-3">
        {filtered.map((u) => (
          <Card key={u.id} className="border-0 shadow-sm">
            <CardContent className="p-4 flex flex-wrap items-center gap-4">
              <Avatar className="h-12 w-12 border-2 border-white/60">
                <AvatarImage src={u.image ?? undefined} alt={u.name ?? ""} />
                <AvatarFallback className="bg-teal-500/15 text-teal-800 font-bold">{(u.name ?? u.email).slice(0, 1)}</AvatarFallback>
              </Avatar>

              <div className="min-w-40">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-slate-800">{u.name ?? "بدون اسم"}</p>
                  {u.role === "ADMIN" ? (
                    <Badge className="bg-slate-800"><ShieldCheck className="h-3 w-3 ml-1" /> أدمن</Badge>
                  ) : (
                    <Badge variant="secondary"><User className="h-3 w-3 ml-1" /> طالب</Badge>
                  )}
                  {u.banned && (
                    <Badge variant="destructive"><Ban className="h-3 w-3 ml-1" /> محظور</Badge>
                  )}
                  {u.summary.violations > 0 && (
                    <Badge variant="destructive"><AlertTriangle className="h-3 w-3 ml-1" /> {u.summary.violations} غش</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400" dir="ltr">{u.email}</p>
                {u.banned && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                    {u.banReason ? `السبب: ${u.banReason} — ` : ""}
                    {u.banUntil ? `لغاية ${fmtDate(u.banUntil)}` : "حظر دائم"}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-center text-xs mr-auto">
                <div><p className="text-lg font-extrabold text-slate-700">{u.summary.enrolled}</p><p className="text-slate-400">كورسات</p></div>
                <div><p className="text-lg font-extrabold text-slate-700">{u.summary.lessonsDone}</p><p className="text-slate-400">دروس</p></div>
                <div><p className="text-lg font-extrabold text-slate-700">{u.summary.examsTaken}</p><p className="text-slate-400">امتحانات</p></div>
                <div><p className="text-lg font-extrabold text-emerald-600">{u.summary.avgScore !== null ? `${u.summary.avgScore}%` : "—"}</p><p className="text-slate-400">المتوسط</p></div>
                <div><p className="text-lg font-extrabold text-amber-600">{u.summary.certificates}</p><p className="text-slate-400">شهادات</p></div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="font-bold" onClick={() => navigate(`#/admin/students/${u.id}`)}>
                  التفاصيل الكاملة
                </Button>
                {u.role === "STUDENT" ? (
                  <Button size="sm" variant="outline" className="text-teal-700" onClick={() => setRole.mutate({ userId: u.id, role: "ADMIN" })}>
                    ترقية لأدمن
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="text-slate-500" onClick={() => setRole.mutate({ userId: u.id, role: "STUDENT" })}>
                    إزالة الإدارة
                  </Button>
                )}
                {u.role === "STUDENT" && !u.banned && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-amber-600 border-amber-300 hover:bg-amber-50 font-bold"
                    onClick={() => { setBanTarget(u); setBanReason(""); setBanDays("0"); }}
                  >
                    <Ban className="h-4 w-4 ml-1" /> حظر
                  </Button>
                )}
                {u.banned && (
                  <Button size="sm" variant="outline" className="text-emerald-700 font-bold" disabled={unbanUser.isPending} onClick={() => unbanUser.mutate(u.id)}>
                    <ShieldOff className="h-4 w-4 ml-1" /> فك الحظر
                  </Button>
                )}
                <Button size="sm" variant="outline" className="text-red-500" onClick={() => confirm(`حذف حساب ${u.name ?? u.email} نهائيًا؟\n\nتنبيه: بريده هيتم حظره — مش هيقدر يسجل بحساب جوجل أو كلمة مرور تاني إلا لو شلت الحظر من قائمة المحظورين.`) && removeUser.mutate(u.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ban dialog — reason + duration */}
      <Dialog open={!!banTarget} onOpenChange={(o) => !o && setBanTarget(null)}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Ban className="h-5 w-5 text-red-500" />
              حظر حساب {banTarget?.name ?? banTarget?.email}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-sm font-bold text-slate-700">سبب الحظر (يظهر للطالب)</Label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="مثال: مخالفة قوانين الامتحانات..."
                rows={3}
                className="rounded-2xl bg-white/60 resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold text-slate-700">مدة الحظر</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { v: "0", label: "دائم" },
                  { v: "1", label: "يوم" },
                  { v: "7", label: "أسبوع" },
                  { v: "30", label: "شهر" },
                ].map((d) => (
                  <button
                    key={d.v}
                    type="button"
                    onClick={() => setBanDays(d.v)}
                    className={`rounded-2xl border py-2.5 text-sm font-bold transition-colors ${
                      banDays === d.v
                        ? "bg-red-500 text-white border-red-500"
                        : "border-slate-200 text-slate-600 hover:bg-red-50"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {banDays === "0" && (
                <p className="text-xs text-amber-600 font-semibold">الحظر الدائم بيفضل شغال حتى لو بعت طلب طعن وانت رفضته — وممكن تقبله في أي وقت من صفحة الطعون.</p>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1 rounded-2xl font-bold bg-red-500 hover:bg-red-600"
                disabled={banUser.isPending}
                onClick={() => banTarget && banUser.mutate({ userId: banTarget.id, reason: banReason.trim(), days: Number(banDays) })}
              >
                {banUser.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Ban className="h-4 w-4 ml-1" />}
                تأكيد الحظر
              </Button>
              <Button variant="outline" className="rounded-2xl font-bold" onClick={() => setBanTarget(null)}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* blocked emails — deleted accounts that can never come back until unblocked */}
      <Card className="border-0 shadow-sm mt-8">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Ban className="h-5 w-5 text-red-500" /> البريدات المحظورة ({(blocked ?? []).length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-slate-400">حسابات محذوفة — ممنوع من رجوعها بتسجيل جوجل أو كلمة مرور. اضغط "فك الحظر" للسماح بالتسجيل من جديد.</p>
          {(blocked ?? []).length === 0 && <p className="text-sm text-slate-400 py-2">لا يوجد بريدات محظورة</p>}
          {(blocked ?? []).map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-red-100 bg-red-50/60 px-4 py-2.5">
              <div>
                <p className="text-sm font-bold text-slate-700">{b.name ?? "بدون اسم"}</p>
                <p className="text-xs text-slate-400" dir="ltr">{b.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">حُظر {fmtDate(b.blockedAt)}</span>
                <Button size="sm" variant="outline" className="text-emerald-700" disabled={unblock.isPending} onClick={() => unblock.mutate(b.email)}>
                  <ShieldOff className="h-3.5 w-3.5 ml-1" /> فك الحظر
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StudentDetail({ studentId }: { studentId: string }) {
  const { navigate } = useHashRoute();
  const { data, isLoading } = useQuery<Detail>({
    queryKey: ["admin-student", studentId],
    queryFn: () => api(`/api/admin/students/${studentId}`),
  });

  if (isLoading || !data) return <Skeleton className="h-96 rounded-3xl" />;
  const u = data.user;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("#/admin/students")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-teal-700 font-semibold">
        <ArrowRight /> رجوع للطلاب
      </button>

      <div className="bg-white rounded-3xl border p-6 flex flex-wrap items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={u.image ?? undefined} alt={u.name ?? ""} />
          <AvatarFallback className="bg-teal-500/15 text-teal-800 font-extrabold text-xl">{(u.name ?? u.email).slice(0, 1)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-slate-800">{u.name ?? "بدون اسم"}</h1>
          <p className="text-sm text-slate-400" dir="ltr">{u.email}</p>
          <p className="text-xs text-slate-400 mt-1">مسجل منذ {fmtDate(u.createdAt)}</p>
        </div>
        <div className="flex gap-6 text-center">
          <div><p className="text-2xl font-black text-teal-700">{data.enrollments.length}</p><p className="text-xs text-slate-400">كورس</p></div>
          <div><p className="text-2xl font-black text-teal-700">{data.lessonProgress.length}</p><p className="text-xs text-slate-400">درس مكتمل</p></div>
          <div><p className="text-2xl font-black text-teal-700">{data.certificates.length}</p><p className="text-xs text-slate-400">شهادة</p></div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeaderTitle icon={<BookOpen className="h-5 w-5 text-teal-700" />} title="كورساته" />
          <CardContent className="space-y-2">
            {data.enrollments.length === 0 && <p className="text-sm text-slate-400">لا يوجد</p>}
            {data.enrollments.map((e) => (
              <div key={e.id} className="rounded-2xl bg-white/50 px-4 py-2.5 text-sm font-semibold text-slate-700">{e.course.title}</div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeaderTitle icon={<GraduationCap className="h-5 w-5 text-teal-700" />} title="آخر الدروس المكتملة" />
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {data.lessonProgress.length === 0 && <p className="text-sm text-slate-400">لا يوجد</p>}
            {data.lessonProgress.map((p) => (
              <div key={p.id} className="rounded-2xl bg-white/50 px-4 py-2.5">
                <p className="text-sm font-semibold text-slate-700">{p.lesson.title}</p>
                <p className="text-xs text-slate-400">{p.lesson.unit.course.title} → {p.lesson.unit.title} • {fmtDate(p.completedAt)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeaderTitle icon={<FileQuestion className="h-5 w-5 text-teal-700" />} title="محاولات الامتحانات" />
          <CardContent className="space-y-2">
            {data.attempts.length === 0 && <p className="text-sm text-slate-400">لا يوجد</p>}
            {data.attempts.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-2xl border border-white/60 p-3">
                <div>
                  <p className="text-sm font-bold text-slate-700">{a.exam.title}</p>
                  <p className="text-xs text-slate-400">
                    {fmtDate(a.startedAt)}
                    {a.violationCount > 0 && <span className="text-red-500 font-bold"> • {a.violationCount} محاولة غش ⚠️</span>}
                  </p>
                </div>
                <Badge className={a.passed ? "bg-emerald-600" : a.status === "IN_PROGRESS" ? "bg-slate-400" : "bg-red-500"}>
                  {a.status === "IN_PROGRESS" ? "جاري" : `${a.percentage ?? 0}%`}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeaderTitle icon={<ClipboardCheck className="h-5 w-5 text-teal-700" />} title="الواجبات" />
          <CardContent className="space-y-2">
            {data.submissions.length === 0 && <p className="text-sm text-slate-400">لا يوجد</p>}
            {data.submissions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-2xl border border-white/60 p-3">
                <div>
                  <p className="text-sm font-bold text-slate-700">{s.assignment.title}</p>
                  <p className="text-xs text-slate-400">{fmtDate(s.submittedAt)}</p>
                </div>
                <Badge className={s.status === "GRADED" ? "bg-emerald-600" : "bg-amber-500"}>
                  {s.status === "GRADED" ? `${s.score}/${s.assignment.maxScore}` : "بالانتظار"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeaderTitle icon={<Award className="h-5 w-5 text-amber-500" />} title="شهاداته" />
          <CardContent className="flex flex-wrap gap-3">
            {data.certificates.length === 0 && <p className="text-sm text-slate-400">لا يوجد</p>}
            {data.certificates.map((c) => (
              <div key={c.id} className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="font-bold text-amber-900 text-sm">{c.title}</p>
                <p className="text-xs text-amber-600 font-mono" dir="ltr">{c.serial}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CardHeaderTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="px-6 pt-5 pb-2 flex items-center gap-2">
      {icon}
      <h3 className="font-extrabold text-slate-800">{title}</h3>
    </div>
  );
}

function ArrowRight() {
  return <ArrowRightIcon className="h-4 w-4" />;
}
