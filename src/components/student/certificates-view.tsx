"use client";

import { useQuery } from "@tanstack/react-query";
import { api, fmtDate } from "@/lib/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Award, Printer, ShieldCheck } from "lucide-react";

type Cert = {
  id: string; serial: string; title: string; reason: string; score: number | null; issuedAt: string;
  user: { name: string | null; email: string };
  course: { title: string } | null;
};

export default function CertificatesView() {
  const { data: certs, isLoading } = useQuery<Cert[]>({ queryKey: ["my-certificates"], queryFn: () => api("/api/certificates") });

  if (isLoading) return <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-64 rounded-3xl" />)}</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2"><Award className="h-6 w-6 text-amber-500" /> شهاداتي</h1>
        <p className="text-slate-500 text-sm mt-1">شهادات الإتمام الخاصة بك — يمكنك طباعتها أو حفظها PDF</p>
      </div>

      {(certs ?? []).length === 0 && (
        <div className="text-center py-20 text-slate-400 bg-white rounded-3xl border border-dashed">
          <Award className="h-14 w-14 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">لا توجد شهادات بعد</p>
          <p className="text-xs mt-1">أكمل دروس كورس أو انجح في امتحانه لتحصل على شهادتك</p>
        </div>
      )}

      <div className="space-y-8">
        {(certs ?? []).map((c) => (
          <div key={c.id} id="certificate-print" className="bg-white rounded-3xl shadow-lg border-4 border-double border-amber-300 overflow-hidden">
            <div className="hero-gradient text-white text-center py-3">
              <p className="font-extrabold text-lg">🎓 بطيخه — منصة التعليم المتكاملة</p>
            </div>
            <div className="p-8 lg:p-12 text-center">
              <Award className="h-14 w-14 mx-auto text-amber-500 mb-4" />
              <p className="text-slate-400 text-sm tracking-widest font-bold">شهادة إتمام</p>
              <p className="text-slate-500 text-sm mt-4">تشهد منصة بطيخه أن</p>
              <p className="text-3xl font-black text-slate-800 my-3">{c.user.name ?? c.user.email}</p>
              <p className="text-slate-500 text-sm">قد أتمّ بنجاح متطلبات</p>
              <p className="text-2xl font-extrabold text-teal-800 my-2">{c.title}</p>
              {c.reason && <p className="text-slate-500 text-sm">({c.reason})</p>}
              {c.score !== null && (
                <p className="mt-2 inline-block rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-1 text-sm font-extrabold">
                  بدرجة {c.score}%
                </p>
              )}

              <div className="flex items-end justify-between mt-10 text-xs text-slate-500">
                <div className="text-right">
                  <p className="font-bold">رقم الشهادة</p>
                  <p className="font-mono text-slate-700 mt-1" dir="ltr">{c.serial}</p>
                </div>
                <div className="flex flex-col items-center text-teal-700">
                  <ShieldCheck className="h-8 w-8 mb-1" />
                  <p className="font-bold">توثيق بطيخه</p>
                </div>
                <div className="text-left">
                  <p className="font-bold">تاريخ الإصدار</p>
                  <p className="mt-1">{fmtDate(c.issuedAt)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/50 border-t border-white/60 py-2 flex justify-center">
              <Button variant="ghost" size="sm" onClick={() => window.print()} className="text-slate-500">
                <Printer className="h-4 w-4 ml-1" /> طباعة / حفظ PDF
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
