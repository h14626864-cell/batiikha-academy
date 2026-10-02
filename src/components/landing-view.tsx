"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ThemeToggle from "@/components/theme-toggle";
import {
  MonitorPlay, ShieldCheck, Award, Users, FileText, BookA,
  Trophy, ArrowLeft, Sparkles, CheckCircle2, ClipboardCheck, Languages,
} from "lucide-react";

const FEATURES = [
  { icon: MonitorPlay, title: "دروس بكل الأشكال", desc: "فيديو من يوتيوب، ملفات PDF، نصوص وصور — محتوى منظم في وحدات ودروس واضحة." },
  { icon: ShieldCheck, title: "امتحانات آمنة", desc: "نظام مضاد للغش يراقب الخروج من الامتحان، مع مؤقت زمني وتصحيح تلقائي فوري." },
  { icon: ClipboardCheck, title: "واجبات ومتابعة", desc: "سلّم واجباتك واستلم تقييم وملاحظات المدرس، وتابع درجاتك خطوة بخطوة." },
  { icon: Award, title: "شهادات إتمام", desc: "أكمل متطلبات الكورس وتحصل على شهادتك تلقائيًا برقم تسلسلي قابل للتحقق والطباعة." },
  { icon: BookA, title: "قاموس تفاعلي", desc: "كلمات إنجليزية مع النطق الصوتي الصحيح بضغطة زر، وشرح مبسط لكل كلمة." },
  { icon: Users, title: "مجتمع تعليمي", desc: "شات مفتوح لكل الطلاب: اسأل، شارك، وتعاون مع زملائك في بيئة منظمة." },
];

const STEPS = [
  { n: "1", title: "أنشئ حسابك", desc: "سجّل بحساب جوجل أو بالبريد الإلكتروني في أقل من دقيقة." },
  { n: "2", title: "اتعلم واتمم", desc: "شاهد الدروس، حل الواجبات، وادخل الامتحانات في مواعيدها." },
  { n: "3", title: "اكتسب شهادتك", desc: "اجمع النقاط، تقدم في الترتيب، واحصل على شهادتك تلقائيًا." },
];

export default function LandingView({ onLogin }: { onLogin: (mode: "login" | "register") => void }) {
  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-nav">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-teal-500/10 border border-teal-500/20 p-2 rounded-2xl text-xl leading-none flex items-center justify-center">🍉</div>
            <span className="text-xl font-extrabold text-slate-800">بطيخه</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-500">
            <a href="#features" className="hover:text-teal-700 transition-colors">المميزات</a>
            <a href="#how" className="hover:text-teal-700 transition-colors">كيف تعمل؟</a>
            <a href="#faq" className="hover:text-teal-700 transition-colors">الأسئلة الشائعة</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" className="font-bold text-slate-600 hover:text-teal-700" onClick={() => onLogin("login")}>
              تسجيل الدخول
            </Button>
            <Button className="bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25 font-bold" onClick={() => onLogin("register")}>
              ابدأ مجانًا <ArrowLeft className="h-4 w-4 mr-1" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/70 via-white to-white">
          <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-teal-500/10 text-teal-700 border border-teal-500/20 mb-5 font-bold">
                <Sparkles className="h-3.5 w-3.5 ml-1" /> منصة تعليمية متكاملة
              </Badge>
              <h1 className="text-4xl lg:text-5xl font-black leading-[1.25] text-slate-900">
                كل محاضراتك وامتحاناتك
                <br />
                <span className="text-teal-700">في مكان واحد منظم</span>
              </h1>
              <p className="text-slate-500 text-lg leading-8 mt-5 max-w-lg">
                كورسات بالفيديو والـ PDF، واجبات، امتحانات إلكترونية آمنة، قاموس بنطق صوتي،
                شهادات إتمام، وترتيب تحفيزي بين الطلاب — رحلتك التعليمية كاملة على بطيخه.
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <Button size="lg" className="h-12 px-7 text-base bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 font-bold shadow-lg shadow-teal-500/30" onClick={() => onLogin("register")}>
                  أنشئ حسابك المجاني
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-7 text-base font-bold border-white/80" onClick={() => onLogin("login")}>
                  تسجيل الدخول
                </Button>
              </div>
              <div className="flex items-center gap-5 mt-8 text-sm text-slate-400">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-teal-600" /> مجاني تمامًا</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-teal-600" /> بدون إعلانات</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-teal-600" /> بالعربي بالكامل</span>
              </div>
            </div>

            {/* Mockup */}
            <div className="hidden lg:block relative">
              <div className="absolute -inset-6 bg-teal-500/20 rounded-[2.5rem] rotate-2" />
              <div className="relative glass-strong rounded-3xl shadow-xl shadow-slate-200/60 p-5 rotate-[-1.5deg]">
                <div className="flex items-center gap-2 pb-3 border-b border-white/60">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/80" />
                  <span className="text-xs text-slate-400 font-bold mr-auto" dir="ltr">batiikha.academy</span>
                </div>
                <div className="pt-4 space-y-3">
                  <div className="flex items-center gap-3 bg-white/50 rounded-3xl p-3">
                    <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-2 rounded-2xl"><MonitorPlay className="h-5 w-5 text-white" /></div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-700">الدرس الثالث: المتغيرات</p>
                      <p className="text-xs text-slate-400">فيديو • 12:45 دقيقة</p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-teal-600" />
                  </div>
                  <div className="flex items-center gap-3 bg-white/50 rounded-3xl p-3">
                    <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-2 rounded-2xl"><FileText className="h-5 w-5 text-white" /></div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-700">الواجب الأول</p>
                      <p className="text-xs text-slate-400">تم التقييم: <span className="font-bold text-teal-700">95/100</span></p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-teal-600" />
                  </div>
                  <div className="flex items-center gap-3 bg-white/50 rounded-3xl p-3">
                    <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-2 rounded-2xl"><ShieldCheck className="h-5 w-5 text-white" /></div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-700">امتحان الوحدة الأولى</p>
                      <p className="text-xs text-slate-400">النتيجة: <span className="font-bold text-teal-700">100%</span> ✓</p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-teal-600" />
                  </div>
                  <div className="flex items-center gap-3 bg-gradient-to-l from-teal-600 to-teal-700 rounded-3xl p-3.5 text-white">
                    <Award className="h-6 w-6" />
                    <div className="flex-1">
                      <p className="text-sm font-extrabold">مبروك! شهادتك جاهزة 🎉</p>
                      <p className="text-[11px] text-teal-100">رقم التسلسل: BT-20260</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20 scroll-mt-16">
          <div className="max-w-6xl mx-auto px-4 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black text-slate-900">كل اللي محتاجه في منصة واحدة</h2>
              <p className="text-slate-500 mt-3 max-w-xl mx-auto leading-7">أدوات مصممة بعناية للتعليم العربي: من الدرس الأول لحد الشهادة.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((f) => (
                <div key={f.title} className="group rounded-3xl glass-strong p-6 hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-600/5 transition-all">
                  <div className="bg-teal-500/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-gradient-to-br from-teal-500 to-emerald-600 transition-colors">
                    <f.icon className="h-6 w-6 text-teal-700 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-lg">{f.title}</h3>
                  <p className="text-slate-500 text-sm leading-7 mt-2">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="py-20 bg-white/50 scroll-mt-16">
          <div className="max-w-6xl mx-auto px-4 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black text-slate-900">كيف تعمل المنصة؟</h2>
              <p className="text-slate-500 mt-3">ثلاث خطوات بسيطة وتبدأ رحلتك</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {STEPS.map((s) => (
                <div key={s.n} className="text-center relative">
                  <div className="w-14 h-14 mx-auto rounded-3xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white text-xl font-black flex items-center justify-center shadow-lg shadow-teal-600/25">
                    {s.n}
                  </div>
                  <h3 className="font-extrabold text-slate-800 mt-4 text-lg">{s.title}</h3>
                  <p className="text-slate-500 text-sm leading-7 mt-2">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20 scroll-mt-16">
          <div className="max-w-3xl mx-auto px-4 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-black text-slate-900">الأسئلة الشائعة</h2>
            </div>
            <div className="space-y-3">
              {[
                { q: "هل المنصة مجانية؟", a: "نعم، كل مزايا المنصة مجانية بالكامل: الكورسات، الواجبات، الامتحانات، الشهادات، والقاموس." },
                { q: "كيف أحصل على الشهادة؟", a: "بعد إكمال متطلبات الكورس (الدروس أو الامتحان حسب قاعدة كل كورس) تُصدر شهادتك تلقائيًا برقم تسلسلي مميز ويمكنك طباعتها." },
                { q: "كيف أدخل الامتحانات؟", a: "المدرس ينشر رابط الامتحان ويحدد موعد الفتح والإغلاق ومدته. ادخل في الوقت المحدد وأجب بتركيز — النظام يصحح تلقائيًا." },
                { q: "ما هي نقاط الترتيب؟", a: "تجمع نقاط من إكمال الدروس وأفضل نتيجة امتحان ومتوسط درجات الواجبات، والأعلى 10 طلاب يظهرون في لوحة الترتيب." },
              ].map((item) => (
                <details key={item.q} className="group rounded-3xl glass-strong open:border-teal-500/25 open:bg-teal-500/10 transition-colors">
                  <summary className="flex items-center justify-between cursor-pointer list-none p-5 font-bold text-slate-700">
                    {item.q}
                    <span className="text-teal-600 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                  </summary>
                  <p className="px-5 pb-5 text-slate-500 text-sm leading-7">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-20">
          <div className="max-w-6xl mx-auto px-4 lg:px-8">
            <div className="bg-gradient-to-l from-teal-700 to-teal-600 rounded-3xl px-8 py-14 text-center text-white relative overflow-hidden">
              <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
              <Trophy className="h-10 w-10 mx-auto mb-4 text-teal-200" />
              <h2 className="text-3xl font-black">جاهز تبدأ رحلتك؟</h2>
              <p className="text-teal-100 mt-3 max-w-md mx-auto leading-7">انضم لطلاب بطيخه الآن، وتعلّم بطريقة حديثة ومنظمة — مجانًا.</p>
              <Button size="lg" className="mt-7 h-12 px-8 text-base bg-white text-teal-700 hover:bg-teal-500/10 font-extrabold shadow-xl" onClick={() => onLogin("register")}>
                ابدأ التعلم الآن <ArrowLeft className="h-4 w-4 mr-2" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="glass-soft border-t border-white/60 py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🍉</span>
            <span className="font-extrabold text-slate-700">بطيخه</span>
            <span className="text-slate-400 text-sm">— منصة تعليمية متكاملة</span>
          </div>
          <p className="text-slate-400 text-xs">© 2026 بطيخه. كل الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}
