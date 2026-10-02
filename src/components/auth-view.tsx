"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { apiPost, fmtDate } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import ThemeToggle from "@/components/theme-toggle";
import {
  Loader2, Sparkles, ShieldCheck, Award, Users, MonitorPlay, FileText, ArrowRight,
  ShieldAlert, CheckCircle2, LogIn, UserPlus, Lock,
} from "lucide-react";

type Mode = "login" | "register";

type BanInfo = {
  reason: string | null;
  until: string | null;
  blocked: boolean;
  pending: boolean;
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 ml-2">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A10.97 10.97 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

export default function AuthView({ initialMode = "login" }: { initialMode?: Mode }) {
  useSession();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ban / appeal state
  const [banned, setBanned] = useState<BanInfo | null>(null);
  const [appealText, setAppealText] = useState("");
  const [appealSent, setAppealSent] = useState(false);
  const [appealLoading, setAppealLoading] = useState(false);

  function resetBanned() {
    setBanned(null);
    setAppealSent(false);
    setAppealText("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        try {
          await apiPost("/api/register", { name, email, password });
          toast.success("تم إنشاء حسابك بنجاح! جاري الدخول...");
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          if (msg.includes("محظور")) {
            // blocked email → show the ban/appeal screen instead of the form
            setBanned({ reason: null, until: null, blocked: true, pending: false });
            return;
          }
          throw err;
        }
      } else {
        // check ban status BEFORE attempting sign-in → drives the appeal screen
        const check = await apiPost<{
          banned: boolean; blocked: boolean; reason: string | null; until: string | null; hasPendingAppeal: boolean;
        }>("/api/auth/ban-check", { email });
        if (check.banned || check.blocked) {
          setBanned({
            reason: check.reason,
            until: check.until,
            blocked: check.blocked,
            pending: check.hasPendingAppeal,
          });
          return;
        }
      }
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) toast.error("بيانات الدخول غير صحيحة");
      else if (res?.ok) window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function sendAppeal() {
    if (!appealText.trim()) return;
    setAppealLoading(true);
    try {
      await apiPost("/api/appeals", { email, message: appealText.trim() });
      setAppealSent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "حدث خطأ";
      toast.error(msg);
      if (msg.includes("قيد المراجعة")) setAppealSent(true);
    } finally {
      setAppealLoading(false);
    }
  }

  /* ---------- shared pieces ---------- */

  const formFields = (p: string, showSwitch: boolean) => (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full h-12 rounded-2xl text-[15px] sm:text-base font-bold text-slate-700"
        onClick={() => signIn("google", { callbackUrl: "/" })}
      >
        <GoogleIcon />
        الدخول بحساب جوجل
      </Button>

      <div className="flex items-center gap-3 my-5">
        <span className="h-px flex-1 bg-slate-200/80" />
        <span className="text-xs text-slate-400 font-semibold">أو بالبريد الإلكتروني</span>
        <span className="h-px flex-1 bg-slate-200/80" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === "register" && (
          <div className="space-y-1.5">
            <Label htmlFor={`${p}-name`} className="text-[13px] sm:text-sm font-bold text-slate-700">الاسم</Label>
            <Input id={`${p}-name`} placeholder="اسمك الكامل" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor={`${p}-email`} className="text-[13px] sm:text-sm font-bold text-slate-700">البريد الإلكتروني</Label>
          <Input id={`${p}-email`} type="email" dir="ltr" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${p}-password`} className="text-[13px] sm:text-sm font-bold text-slate-700">كلمة المرور</Label>
          <Input id={`${p}-password`} type="password" dir="ltr" autoComplete={mode === "login" ? "current-password" : "new-password"} inputMode="text" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>
        <Button type="submit" disabled={loading} className="w-full h-12 rounded-2xl text-base font-bold">
          {loading && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
          {mode === "login" ? "تسجيل الدخول" : "إنشاء الحساب"}
        </Button>
      </form>

      {showSwitch && (
        <p className="text-center text-[13px] sm:text-sm text-slate-500 mt-5">
          {mode === "login" ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="text-teal-700 font-bold hover:underline"
          >
            {mode === "login" ? "أنشئ حسابًا" : "سجّل الدخول"}
          </button>
        </p>
      )}
    </>
  );

  const banScreen = (compact: boolean) =>
    banned && (
      <div className={compact ? "text-center py-2" : "text-center py-6"}>
        {appealSent || banned.pending ? (
          <>
            <div className="mx-auto w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold mt-4 text-slate-800">وصل طلبك للإدارة</h3>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed max-w-xs mx-auto">
              الإدارة هتراجع طلب الطعن وترد عليك — لو اتقبل الحظر هيتشال وتقدر تدخل عادي.
            </p>
            <Button variant="outline" className="mt-6 rounded-2xl font-bold" onClick={resetBanned}>
              رجوع لتسجيل الدخول
            </Button>
          </>
        ) : (
          <>
            <div className="mx-auto w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/25 flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold mt-4 text-slate-800">
              {banned.blocked ? "البريد محظور من الإدارة" : "حسابك محظور"}
            </h3>
            {banned.reason && (
              <p className="text-slate-600 text-sm mt-2 bg-red-500/5 border border-red-500/15 rounded-xl px-4 py-2.5">
                سبب الحظر: <span className="font-bold">{banned.reason}</span>
              </p>
            )}
            <p className="text-slate-500 text-[13px] mt-2">
              {banned.until
                ? `الحظر لغاية: ${fmtDate(banned.until)}`
                : banned.blocked
                  ? "مينفعش تسجل بحساب جديد بنفس البريد"
                  : "الحظر دائم لحد ما الإدارة تقبل طلب الطعن"}
            </p>

            {!banned.pending ? (
              <>
                <p className="text-sm font-bold text-slate-700 mt-5 mb-2 text-right">طلب طعن — اشرح للإدارة سبب رجوعك:</p>
                <Textarea
                  value={appealText}
                  onChange={(e) => setAppealText(e.target.value)}
                  placeholder="اكتب طلبك هنا..."
                  rows={4}
                  className="rounded-2xl bg-white/60 resize-none"
                />
                <Button
                  className="w-full h-12 rounded-2xl text-base font-bold mt-3"
                  disabled={!appealText.trim() || appealLoading}
                  onClick={sendAppeal}
                >
                  {appealLoading ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 ml-2" />}
                  إرسال طلب الطعن
                </Button>
              </>
            ) : (
              <p className="mt-4 text-amber-600 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-2.5 text-sm font-bold">
                عندك طلب طعن قيد المراجعة بالفعل — استنى رد الإدارة
              </p>
            )}
          </>
        )}
      </div>
    );

  /* ---------- MOBILE: immersive full-gradient app-style design (different from desktop) ---------- */

  const mobileLayout = (
    <div className="lg:hidden min-h-screen hero-gradient relative overflow-hidden flex flex-col" dir="rtl">
      {/* soft light blobs */}
      <div className="absolute -top-28 -right-24 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -left-28 w-72 h-72 rounded-full bg-cyan-300/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-14 w-72 h-72 rounded-full bg-emerald-300/15 blur-3xl pointer-events-none" />

      {/* top bar */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-4">
        <ThemeToggle className="glass rounded-full" />
        <button
          onClick={() => (window.location.hash = "")}
          className="flex items-center gap-1.5 text-sm font-bold text-white/90 hover:text-white bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 rounded-full px-4 py-2 transition-colors"
        >
          <ArrowRight className="h-4 w-4" />
          رجوع
        </button>
      </div>

      {/* centered brand + welcome */}
      <div className="relative z-10 flex flex-col items-center text-center mt-7 px-6">
        <div className="bg-white/20 backdrop-blur-md border border-white/25 shadow-lg p-3.5 rounded-[1.75rem] text-4xl leading-none">🍉</div>
        <h1 className="text-[1.7rem] font-extrabold text-white mt-3 tracking-tight">بطيخه</h1>
        <p className="text-teal-50/85 text-xs">منصة التعليم المتكاملة</p>

        <h2 className="text-2xl font-extrabold text-white leading-snug mt-6">
          {banned ? "عندنا ملاحظة" : mode === "login" ? "نوّرت! 👋" : "ابدأ رحلتك من هنا"}
        </h2>
        {!banned && (
          <p className="text-teal-50/85 text-[13px] mt-1.5 max-w-xs">
            {mode === "login" ? "سجل دخولك وكمّل من حيث وقفت" : "اعمل حسابك الجديد في أقل من دقيقة"}
          </p>
        )}
      </div>

      {/* segmented tab switcher */}
      {!banned && (
        <div className="relative z-10 mx-auto mt-6 w-[min(92%,22rem)]">
          <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-full p-1.5 grid grid-cols-2 gap-1">
            <button
              onClick={() => setMode("login")}
              className={`flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-bold transition-all ${
                mode === "login" ? "bg-white text-teal-800 shadow-md" : "text-white/85"
              }`}
            >
              <LogIn className="h-4 w-4" />
              تسجيل الدخول
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-bold transition-all ${
                mode === "register" ? "bg-white text-teal-800 shadow-md" : "text-white/85"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              حساب جديد
            </button>
          </div>
        </div>
      )}

      {/* form card */}
      <div className="relative z-10 flex-1 px-4 mt-5 pb-8">
        <div className="glass-strong rounded-[2rem] p-5 max-w-md mx-auto min-h-44">
          {banned ? banScreen(true) : formFields("m", false)}
        </div>
        <p className="text-center text-teal-50/70 text-[11px] mt-6">© 2026 بطيخه — كل الحقوق محفوظة</p>
      </div>
    </div>
  );

  /* ---------- DESKTOP: split layout (unchanged identity) ---------- */

  const desktopLayout = (
    <div className="hidden lg:flex min-h-screen flex-row" dir="rtl">
      <div className="hidden lg:block fixed top-4 left-4 z-50">
        <ThemeToggle className="glass rounded-full shadow-lg" />
      </div>

      {/* Brand panel */}
      <div className="hero-gradient relative overflow-hidden p-14 lg:w-[55%] flex flex-col">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 w-80 h-80 rounded-full bg-cyan-300/20 blur-3xl" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-white/20 backdrop-blur-md border border-white/25 shadow-lg p-3 rounded-2xl text-3xl leading-none flex items-center justify-center">🍉</div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">بطيخه</h1>
            <p className="text-teal-50/90 text-sm">منصة التعليم المتكاملة</p>
          </div>
        </div>

        <div className="relative z-10 mt-auto mb-10">
          <h2 className="text-5xl font-extrabold leading-tight text-white mb-4">
            تعلّم بأفضل شكل،
            <br />
            <span className="text-cyan-100">وشوف نتيجتك</span>
          </h2>
          <p className="text-teal-50/90 text-lg max-w-lg leading-relaxed">
            كورسات ودروس بالفيديو والـ PDF، واجبات وامتحانات آمنة، شهادات معتمدة،
            وترتيب بين الطلاب — كله في مكان واحد.
          </p>

          <div className="grid grid-cols-3 gap-3 mt-10 max-w-xl">
            {[
              { icon: MonitorPlay, label: "دروس متنوعة" },
              { icon: ShieldCheck, label: "امتحانات آمنة" },
              { icon: Award, label: "شهادات إتمام" },
              { icon: Users, label: "مجتمع تعليمي" },
              { icon: FileText, label: "واجبات ومتابعة" },
              { icon: Sparkles, label: "ترتيب الطلاب" },
            ].map((f) => (
              <div key={f.label} className="bg-white/12 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 flex items-center gap-2.5 text-sm font-semibold text-white transition-colors">
                <span className="bg-white/20 rounded-xl p-1.5 flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-cyan-100 shrink-0" />
                </span>
                {f.label}
              </div>
            ))}
          </div>
        </div>

        <p className="text-teal-100/80 text-sm relative z-10 mt-auto">© 2026 بطيخه — كل الحقوق محفوظة</p>
      </div>

      {/* Auth form */}
      <div className="lg:w-[45%] flex items-center justify-center px-6 py-10">
        <div className="glass-strong w-full max-w-md rounded-3xl p-8 relative">
          <button
            onClick={() => (window.location.hash = "")}
            className="absolute -top-12 right-0 flex items-center gap-1.5 text-sm font-bold text-white/90 hover:text-white bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 rounded-full px-4 py-2 transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            رجوع للرئيسية
          </button>
          {banned ? (
            banScreen(false)
          ) : (
            <>
              <h3 className="text-2xl font-extrabold mb-1 text-slate-800">
                {mode === "login" ? "أهلًا بعودتك 👋" : "إنشاء حساب جديد"}
              </h3>
              <p className="text-slate-500 text-sm mb-6">
                {mode === "login" ? "سجّل دخولك وكمّل رحلتك التعليمية" : "انضم لآلاف الطلاب على بطيخه"}
              </p>
              {formFields("d", true)}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {mobileLayout}
      {desktopLayout}
      {/* safety lock icon hint on mobile when banned (decorative accessibility anchor) */}
      {banned && (
        <div className="lg:hidden fixed bottom-4 left-4 z-50">
          <span className="glass rounded-full p-2.5 flex items-center justify-center text-red-500">
            <Lock className="h-4 w-4" />
          </span>
        </div>
      )}
    </>
  );
}
