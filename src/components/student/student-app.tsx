"use client";

import { signOut } from "next-auth/react";
import { useHashRoute } from "@/lib/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import StudentDashboard from "@/components/student/student-dashboard";
import CoursesView from "@/components/student/courses-view";
import CourseView from "@/components/student/course-view";
import ExamsView from "@/components/student/exams-view";
import ExamRunner from "@/components/student/exam-runner";
import AssignmentsView from "@/components/student/assignments-view";
import CommunityView from "@/components/student/community-view";
import LeaderboardView from "@/components/student/leaderboard-view";
import CertificatesView from "@/components/student/certificates-view";
import StudentDictionary from "@/components/student/student-dictionary";
import ThemeToggle from "@/components/theme-toggle";
import {
  LayoutDashboard, BookOpen, ClipboardCheck, FileQuestion,
  Users, Trophy, Award, LogOut, Menu, X, BookA, type LucideIcon,
} from "lucide-react";
import { useState } from "react";

type SessionUser = { user: { id: string; name?: string | null; email?: string | null; image?: string | null; role: string } };

const NAV: { key: string; label: string; icon: LucideIcon; hash: string }[] = [
  { key: "", label: "الرئيسية", icon: LayoutDashboard, hash: "#/" },
  { key: "courses", label: "الكورسات", icon: BookOpen, hash: "#/courses" },
  { key: "exams", label: "الامتحانات", icon: FileQuestion, hash: "#/exams" },
  { key: "assignments", label: "الواجبات", icon: ClipboardCheck, hash: "#/assignments" },
  { key: "dictionary", label: "القاموس", icon: BookA, hash: "#/dictionary" },
  { key: "community", label: "المجتمع", icon: Users, hash: "#/community" },
  { key: "leaderboard", label: "الترتيب", icon: Trophy, hash: "#/leaderboard" },
  { key: "certificates", label: "شهاداتي", icon: Award, hash: "#/certificates" },
];

export default function StudentApp({ session, segs }: { session: SessionUser; segs: string[] }) {
  const { navigate } = useHashRoute();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = session.user;

  const activeKey = NAV.slice().reverse().find((n) => (n.key === "" ? segs.length === 0 : segs[0] === n.key))?.key ?? "";

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => (
        <button
          key={n.key}
          onClick={() => { navigate(n.hash); setMenuOpen(false); }}
          className={cn(
            "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors text-right",
            activeKey === n.key
              ? "bg-gradient-to-l from-teal-600 to-emerald-500 text-white shadow-lg shadow-teal-500/30"
              : "text-slate-600 hover:bg-white/70 hover:text-teal-900"
          )}
        >
          <n.icon className="h-5 w-5 shrink-0" />
          {n.label}
        </button>
      ))}
    </nav>
  );

  // exam taking takes over the whole screen
  if (segs[0] === "exam" && segs[1]) {
    return <ExamRunner token={segs[1]} navigateTo={(to) => (window.location.hash = to)} />;
  }

  const content = (() => {
    if (segs[0] === "course" && segs[1]) return <CourseView courseId={segs[1]} />;
    switch (segs[0]) {
      case "courses": return <CoursesView />;
      case "exams": return <ExamsView />;
      case "assignments": return <AssignmentsView />;
      case "dictionary": return <StudentDictionary />;
      case "community": return <CommunityView />;
      case "leaderboard": return <LeaderboardView />;
      case "certificates": return <CertificatesView />;
      default: return <StudentDashboard />;
    }
  })();

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      {/* Topbar */}
      <header className="sticky top-0 z-40 glass-nav">
        <div className="flex items-center justify-between px-4 lg:px-8 h-16">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="القائمة">
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <button className="flex items-center gap-2" onClick={() => navigate("#/")}>
              <div className="bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/30 p-2 rounded-2xl text-xl leading-none flex items-center justify-center">🍉</div>
              <span className="text-xl font-extrabold text-slate-800">بطيخه</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-left">
              <p className="text-sm font-bold text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-400" dir="ltr">{user.email}</p>
            </div>
            <Avatar className="h-9 w-9 border-2 border-teal-300/60">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
              <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-bold">
                {(user.name ?? "ط").slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: "/" })} aria-label="تسجيل الخروج">
              <LogOut className="h-5 w-5 text-slate-500" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar desktop */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 border-l border-white/60 bg-white/45 backdrop-blur-2xl p-4 sticky top-16 h-[calc(100vh-4rem)]">
          {nav}
          <div className="mt-auto rounded-3xl hero-gradient p-4 text-white text-sm shadow-lg shadow-teal-600/20">
            <p className="font-bold mb-1">استمر في التعلم! 🚀</p>
            <p className="text-teal-50 text-xs leading-relaxed">أكمل دروسك وامتحاناتك لتحصل على الشهادة وتتقدم في الترتيب.</p>
          </div>
        </aside>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden fixed inset-0 z-30 top-16 bg-white/95 backdrop-blur-2xl border-t border-white/60 p-4 overflow-y-auto" onClick={() => setMenuOpen(false)}>
            {nav}
          </div>
        )}

        <main className="flex-1 p-4 lg:p-8 max-w-6xl mx-auto w-full">{content}</main>
      </div>

      <footer className="bg-white/40 backdrop-blur-xl border-t border-white/60 py-4 text-center text-xs text-slate-400 mt-auto">
        بطيخه — منصة تعليمية متكاملة © 2026
      </footer>
    </div>
  );
}
