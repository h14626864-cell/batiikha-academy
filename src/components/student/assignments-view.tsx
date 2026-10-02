"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPost, fmtDate } from "@/lib/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ClipboardCheck, Upload, Loader2, Clock, CheckCircle2, Paperclip } from "lucide-react";

type Assignment = {
  id: string; title: string; description: string; dueDate: string | null; maxScore: number;
  allowFile: boolean; allowText: boolean; course: { title: string };
  submissions: { id: string; status: string; score: number | null; feedback: string | null; content: string; fileUrl: string | null; submittedAt: string }[];
};

export default function AssignmentsView() {
  const qc = useQueryClient();
  const [active, setActive] = useState<Assignment | null>(null);
  const [text, setText] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: assignments, isLoading } = useQuery<Assignment[]>({
    queryKey: ["student-assignments"],
    queryFn: () => api("/api/assignments"),
  });

  const submit = useMutation({
    mutationFn: (assignmentId: string) =>
      apiPost(`/api/assignments/${assignmentId}/submit`, { content: text, fileUrl }),
    onSuccess: () => {
      toast.success("تم تسليم الواجب بنجاح ✓");
      setActive(null); setText(""); setFileUrl(null);
      qc.invalidateQueries({ queryKey: ["student-assignments"] });
      qc.invalidateQueries({ queryKey: ["student-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function upload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFileUrl(data.url);
      toast.success("تم رفع الملف ✓");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الرفع");
    } finally {
      setUploading(false);
    }
  }

  if (isLoading) return <div className="grid sm:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 rounded-3xl" />)}</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800">الواجبات</h1>
        <p className="text-slate-500 text-sm mt-1">سلّم واجباتك في الموعد المحدد ليقيّمها المعلم</p>
      </div>

      {(assignments ?? []).length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>لا توجد واجبات متاحة</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-5">
        {(assignments ?? []).map((a) => {
          const sub = a.submissions[0];
          const overdue = a.dueDate && new Date(a.dueDate) < new Date() && !sub;
          return (
            <Card key={a.id} className="border-0 shadow-sm card-hover">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-teal-700 font-bold">{a.course.title}</p>
                    <h3 className="font-extrabold text-lg text-slate-800">{a.title}</h3>
                  </div>
                  {sub ? (
                    <Badge className={sub.status === "GRADED" ? "bg-emerald-600" : "bg-amber-500"}>
                      {sub.status === "GRADED" ? `مُقيّم: ${sub.score}/${a.maxScore}` : "تم التسليم — بالانتظار"}
                    </Badge>
                  ) : overdue ? (
                    <Badge variant="destructive">فوات الموعد</Badge>
                  ) : (
                    <Badge className="bg-gradient-to-br from-teal-500 to-emerald-600">مطلوب</Badge>
                  )}
                </div>

                <p className="text-sm text-slate-500 line-clamp-2">{a.description}</p>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="h-3.5 w-3.5" /> آخر موعد: {fmtDate(a.dueDate)}
                </div>

                {sub?.feedback && (
                  <div className="rounded-2xl bg-white/50 border p-3 text-xs text-slate-600">
                    <b>ملاحظات المعلم:</b> {sub.feedback}
                  </div>
                )}

                <Button
                  className="w-full font-bold bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25"
                  onClick={() => {
                    setActive(a);
                    setText(sub?.content ?? "");
                    setFileUrl(sub?.fileUrl ?? null);
                  }}
                >
                  {sub ? "إعادة التسليم / تعديل" : "تسليم الواجب"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Submit dialog */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="text-lg">تسليم: {active?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {active?.allowText && (
              <div className="space-y-1.5">
                <Label>الإجابة النصية</Label>
                <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب حلّك هنا..." />
              </div>
            )}
            {active?.allowFile && (
              <div className="space-y-1.5">
                <Label>الملف (PDF أو صورة)</Label>
                <Input
                  type="file" accept=".pdf,image/*"
                  onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
                  className="cursor-pointer"
                />
                {uploading && <p className="text-xs text-teal-700 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> جاري الرفع...</p>}
                {fileUrl && (
                  <p className="text-xs text-emerald-700 flex items-center gap-1">
                    <Paperclip className="h-3 w-3" /> تم إرفاق:{" "}
                    <a href={fileUrl} target="_blank" rel="noreferrer" className="underline">{fileUrl}</a>
                  </p>
                )}
              </div>
            )}
            <Button
              className="w-full font-bold bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25"
              disabled={submit.isPending || uploading || (!text.trim() && !fileUrl)}
              onClick={() => active && submit.mutate(active.id)}
            >
              {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
              تسليم
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
