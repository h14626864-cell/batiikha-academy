"use client";

import { signOut } from "next-auth/react";
import { useHashRoute, api } from "@/lib/client";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import AdminDashboard from "@/components/admin/admin-dashboard";
import AdminCourses from "@/components/admin/admin-courses";
import AdminCourseEditor from "@/components/admin/admin-course-editor";
import AdminStudents from "@/components/admin/admin-students";
import AdminAssignments from "@/components/admin/admin-assignments";
import AdminExams from "@/components/admin/admin-exams";
import AdminExamEditor from "@/components/admin/admin-exam-editor";
import AdminCertificates from "@/components/admin/admin-certificates";
import AdminDictionary from "@/components/admin/admin-dictionary";
import AdminAppeals from "@/components/admin/admin-appeals";
import AdminCommunity from "@/components/admin/admin-community";
import ThemeToggle from "@/components/theme-toggle";
import {
  LayoutDashboard, BookOpen, Users, ClipboardCheck,
  FileQuestion, Award, LogOut, Menu, X, BookA, MessagesSquare, Gavel, type LucideIcon,
} from "lucide-react";
import { useState } from "react";

type SessionUser = { user: { id: string; name?: string | null; email?: string | null; image?: string | null; role: string } };

const NAV: { key: string; label: string; icon: LucideIcon; hash: string }[] = [
  { key: "", label: "نظرة عامة", icon: LayoutDashboard, hash: "#/admin" },
  { key: "courses", label: "الكورسات والدروس", icon: BookOpen, hash: "#/admin/courses" },
  { key: "exams", label: "الامتحانات", icon: FileQuestion, hash: "#/admin/exams" },
  { key: "assignments", label: "الواجبات", icon: ClipboardCheck, hash: "#/admin/assignments" },
  { key: "community", label: "المجتمع", icon: MessagesSquare, hash: "#/admin/community" },
  { key: "dictionary", label: "القاموس", icon: BookA, hash: "#/admin/dictionary" },
  { key: "students", label: "الطلاب والمتابعة", icon: Users, hash: "#/admin/students" },
  { key: "appeals", label: "الطعون", icon: Gavel, hash: "#/admin/appeals" },
  { key: "certificates", label: "الشهادات", icon: Award, hash: "#/admin/certificates" },
];

export default function AdminApp({ session, segs }: { session: SessionUser; segs: string[] }) {
  const { navigate } = useHashRoute();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = session.user;

  // pending appeals count → badge on the nav item
  const { data: appeals } = useQuery<{ status: string }[]>({
    queryKey: ["admin-appeals-badge"],
    queryFn: () => api("/api/admin/appeals"),
    refetchInterval: 30000,
  });
  const pendingAppeals = (appeals ?? []).filter((a) => a.status === "PENDING").length;

  const activeKey = NAV.slice().reverse().find((n) => (n.key === "" ? segs.length === 1 : segs[0] === "admin" && segs[1] === n.key))?.key ?? "";

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
          {n.key === "appeals" && pendingAppeals > 0 && (
            <span className="mr-auto bg-red-500 text-white text-[11px] font-bold rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">
              {pendingAppeals}
            </span>
          )}
        </button>
      ))}
    </nav>
  );

  const content = (() => {
    // #/admin/...
    const section = segs[1] ?? "";
    const id = segs[2];
    switch (section) {
      case "courses":
        return id ? <AdminCourseEditor courseId={id} /> : <AdminCourses />;
      case "exams":
        return id ? <AdminExamEditor examId={id} /> : <AdminExams />;
      case "assignments": return <AdminAssignments />;
      case "dictionary": return <AdminDictionary />;
      case "students": return <AdminStudents studentId={id} />;
      case "appeals": return <AdminAppeals />;
      case "community": return <AdminCommunity />;
      case "certificates": return <AdminCertificates />;
      default: return <AdminDashboard />;
    }
  })();

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <header className="sticky top-0 z-40 glass-nav">
        <div className="flex items-center justify-between px-4 lg:px-8 h-16">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="القائمة">
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <button className="flex items-center gap-2" onClick={() => navigate("#/admin")}>
              <div className="bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/30 p-2 rounded-2xl text-xl leading-none flex items-center justify-center">🍉</div>
              <div className="text-right">
                <p className="text-lg font-extrabold leading-none text-slate-800">بطيخه</p>
                <p className="text-[10px] text-teal-700 font-bold">لوحة الإدارة</p>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Badge className="melon-gradient text-white border-0 font-bold shadow-sm">مدير المنصة</Badge>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-bold text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-400" dir="ltr">{user.email}</p>
            </div>
            <Avatar className="h-9 w-9 border-2 border-teal-300/60">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
              <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-bold">{(user.name ?? "أ").slice(0, 1)}</AvatarFallback>
            </Avatar>
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: "/" })} aria-label="خروج">
              <LogOut className="h-5 w-5 text-slate-500" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white/45 backdrop-blur-2xl border-l border-white/60 p-4 sticky top-16 h-[calc(100vh-4rem)]">
          {nav}
          <div className="mt-auto rounded-3xl hero-gradient p-4 text-white text-sm shadow-lg shadow-teal-600/20">
            <p className="font-bold mb-1">وضع الإدارة 🛡️</p>
            <p className="text-teal-50 text-xs leading-relaxed">لديك صلاحية كاملة: كورسات، امتحانات، طلاب، شهادات.</p>
          </div>
        </aside>

        {menuOpen && (
          <div className="lg:hidden fixed inset-0 z-30 top-16 bg-white/95 backdrop-blur-2xl border-t border-white/60 p-4 overflow-y-auto" onClick={() => setMenuOpen(false)}>
            {nav}
          </div>
        )}

        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">{content}</main>
      </div>
    </div>
  );
}
