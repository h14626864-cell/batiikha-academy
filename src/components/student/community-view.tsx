"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPost, apiDelete, fmtDate } from "@/lib/client";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Users, Loader2, Send, Trash2, ShieldCheck, MessageCircle, Reply, Lock } from "lucide-react";

type Author = { id: string; name: string | null; image: string | null; role: string };
type Post = {
  id: string; title: string; content: string; createdAt: string; user: Author;
  _count: { comments: number };
  comments: { id: string; content: string; createdAt: string; user: Author }[];
};

export default function CommunityView() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);

  // Chat-style feed: posts WITH comments inline, polled every 8s for live feel
  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["community-feed"],
    queryFn: async () => {
      const list = await api<Post[]>("/api/community");
      return list.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    },
    refetchInterval: 8000,
  });

  // chat lock state (admin can close it for everyone)
  const { data: settings } = useQuery<{ locked: boolean }>({
    queryKey: ["community-settings"],
    queryFn: () => api("/api/community/settings"),
    refetchInterval: 20000,
  });
  const chatLocked = settings?.locked ?? false;

  const me = (session?.user as { id?: string })?.id;
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

  // Auto-scroll to bottom on first load and when a new message arrives
  useEffect(() => {
    if (!posts) return;
    const total = posts.reduce((n, p) => n + 1 + p.comments.length, 0);
    if (prevCount.current === 0 || total > prevCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: prevCount.current === 0 ? "auto" : "smooth", block: "end" });
    }
    prevCount.current = total;
  }, [posts]);

  const sendMessage = useMutation({
    mutationFn: () => {
      const content = message.trim();
      return apiPost("/api/community", { title: content.slice(0, 80), content });
    },
    onSuccess: () => {
      setMessage("");
      qc.invalidateQueries({ queryKey: ["community-feed"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addComment = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      apiPost("/api/community/comments", { postId, content }),
    onSuccess: () => {
      setReplyText(""); setReplyTo(null);
      qc.invalidateQueries({ queryKey: ["community-feed"] });
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community-feed"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-3xl" />)}</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] lg:h-[calc(100vh-9rem)]">
      {/* Chat header */}
      <div className="flex items-center justify-between glass-strong rounded-t-2xl px-4 lg:px-6 py-3.5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-teal-500/10 p-2.5 rounded-2xl">
            <Users className="h-5 w-5 text-teal-700" />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-800">مجتمع بطيخه</h1>
            <p className="text-xs text-slate-400">{chatLocked ? "الشات مقفول حاليًا — تقدر تقرا الرسايل بس" : "شات مفتوح للجميع — اسأل، شارك، وتعاون"}</p>
          </div>
        </div>
        {chatLocked && (
          <Badge variant="destructive" className="font-bold">
            <Lock className="h-3 w-3 ml-1" /> مقفول
          </Badge>
        )}
        {!chatLocked && (
          <Badge variant="secondary" className="bg-teal-500/10 text-teal-700 border-0 font-bold">
            {(posts ?? []).length} رسالة
          </Badge>
        )}
      </div>

      {/* locked banner */}
      {chatLocked && (
        <div className="shrink-0 bg-red-500/10 border-x border-red-500/20 px-4 lg:px-6 py-2.5 flex items-center gap-2">
          <Lock className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-xs sm:text-sm font-bold text-red-600">
            الشات مقفول مؤقتًا من الإدارة — مش هتقدر تكتب أو ترد لحد ما يتح مرة تانية
          </p>
        </div>
      )}

      {/* Messages feed */}
      <div className="flex-1 overflow-y-auto bg-white border-x border-white/70 px-4 lg:px-6 py-4 space-y-4 min-h-0">
        {(posts ?? []).length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-16">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-slate-500">الشات فاضي — كن أول من يكتب!</p>
            <p className="text-xs mt-1">اكتب رسالتك في الصندوق تحت وابعتها 👇</p>
          </div>
        )}

        {(posts ?? []).map((p) => (
          <div key={p.id} className="group">
            {/* message bubble */}
            <div className="flex items-start gap-2.5">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={p.user?.image ?? undefined} alt={p.user?.name ?? ""} />
                <AvatarFallback className="bg-teal-500/10 text-teal-800 font-bold text-sm">{(p.user?.name ?? "ط").slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 max-w-[85%] sm:max-w-[75%]">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-extrabold text-slate-700">{p.user?.name ?? "طالب"}</span>
                  {p.user?.role === "ADMIN" && (
                    <Badge className="bg-teal-500/10 text-teal-700 border border-teal-500/20 text-[10px] px-1.5 py-0">
                      <ShieldCheck className="h-3 w-3 ml-0.5" /> إدارة
                    </Badge>
                  )}
                  <span className="text-[10px] text-slate-400">{fmtDate(p.createdAt)}</span>
                  {(isAdmin || p.user?.id === me) && (
                    <button
                      onClick={() => removePost.mutate(p.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-500"
                      aria-label="حذف الرسالة"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="rounded-3xl rounded-tr-sm bg-white/50 border border-white/60 px-4 py-2.5">
                  <p className="text-sm text-slate-700 leading-6 whitespace-pre-wrap break-words">{p.content}</p>
                </div>

                {/* replies (inline, no popup) */}
                {p.comments.length > 0 && (
                  <div className="mt-2 space-y-1.5 mr-4">
                    {p.comments.map((c) => (
                      <div key={c.id} className="flex items-start gap-2 group/comment">
                        <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                          <AvatarImage src={c.user?.image ?? undefined} alt="" />
                          <AvatarFallback className="bg-white/60 text-slate-600 text-[10px]">{(c.user?.name ?? "ط").slice(0, 1)}</AvatarFallback>
                        </Avatar>
                        <div className="rounded-2xl bg-teal-500/10 border border-teal-500/25 px-3 py-1.5 min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                            {c.user?.name ?? "طالب"}
                            {c.user?.role === "ADMIN" && <ShieldCheck className="h-3 w-3 text-teal-600" />}
                            <span className="font-normal text-slate-400">• {fmtDate(c.createdAt)}</span>
                            {(isAdmin || c.user?.id === me) && (
                              <button
                                onClick={() => removeComment.mutate(c.id)}
                                className="opacity-0 group-hover/comment:opacity-100 transition-opacity text-slate-300 hover:text-red-500 mr-auto"
                                aria-label="حذف الرد"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </p>
                          <p className="text-xs text-slate-600 leading-5 whitespace-pre-wrap break-words mt-0.5">{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* reply toggle */}
                {replyTo === p.id ? (
                  <div className="flex gap-2 mt-2 mr-4">
                    <Input
                      autoFocus
                      disabled={chatLocked}
                      placeholder={chatLocked ? "الشات مقفول حاليًا..." : `ردًا على ${p.user?.name ?? "الرسالة"}...`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && replyText.trim() && !addComment.isPending && !chatLocked) {
                          addComment.mutate({ postId: p.id, content: replyText.trim() });
                        }
                      }}
                      className="h-9 text-sm bg-white"
                    />
                    <Button
                      size="icon"
                      className="h-9 w-9 shrink-0 bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25"
                      disabled={!replyText.trim() || addComment.isPending || chatLocked}
                      onClick={() => addComment.mutate({ postId: p.id, content: replyText.trim() })}
                      aria-label="إرسال الرد"
                    >
                      {addComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setReplyTo(null); setReplyText(""); }}>
                      إلغاء
                    </Button>
                  </div>
                ) : (
                  !chatLocked && (
                    <button
                      onClick={() => { setReplyTo(p.id); setReplyText(""); }}
                      className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-teal-700 mt-1.5 mr-4 transition-colors"
                    >
                      <Reply className="h-3 w-3" /> رد
                      {p.comments.length > 0 && <span>({p.comments.length})</span>}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer — hidden for students when the chat is locked (admins keep access) */}
      {(!chatLocked || isAdmin) && (
        <div className="shrink-0 glass-strong rounded-b-2xl border-t-0 px-4 lg:px-6 py-3.5">
          {chatLocked && isAdmin && (
            <p className="text-[11px] font-bold text-red-500 mb-2 flex items-center gap-1">
              <Lock className="h-3 w-3" /> الشات مقفول عن الطلاب — رسايلك بتظهر كإعلانات إدارة
            </p>
          )}
          <div className="flex gap-2">
            <Input
              placeholder={chatLocked ? "اكتب إعلان للطلاب..." : "اكتب رسالتك للمجتمع..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && message.trim() && !sendMessage.isPending) sendMessage.mutate();
              }}
              className="h-11 bg-white/50 border-white/70 focus-visible:bg-white"
            />
            <Button
              className="h-11 px-5 bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25 shrink-0 font-bold"
              disabled={!message.trim() || sendMessage.isPending}
              onClick={() => sendMessage.mutate()}
            >
              {sendMessage.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              <span className="hidden sm:inline mr-1.5">إرسال</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
