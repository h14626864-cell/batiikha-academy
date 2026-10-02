"use client";

import { useSession } from "next-auth/react";
import { useHashRoute } from "@/lib/client";
import AuthView from "@/components/auth-view";
import LandingView from "@/components/landing-view";
import StudentApp from "@/components/student/student-app";
import AdminApp from "@/components/admin/admin-app";
import ExamRunner from "@/components/student/exam-runner";
import { Loader2 } from "lucide-react";

export default function AppRoot() {
  const { data: session, status } = useSession();
  const { segs, navigate } = useHashRoute();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-teal-600 mx-auto" />
          <p className="text-slate-500 font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    // Public site: landing page at #/ , auth form at #/login
    if (segs[0] === "login") {
      return <AuthView initialMode={segs[1] === "register" ? "register" : "login"} />;
    }
    return (
      <LandingView
        onLogin={(mode) => navigate(mode === "register" ? "#/login/register" : "#/login")}
      />
    );
  }

  const role = (session.user as { role?: string }).role ?? "STUDENT";

  // Exam runner route (student): #/exam/<token>
  if (segs[0] === "exam" && segs[1] && role !== "ADMIN") {
    return <ExamRunner token={segs[1]} navigateTo={(to) => (window.location.hash = to)} />;
  }

  if (role === "ADMIN") {
    return <AdminApp session={session} segs={segs} />;
  }

  return <StudentApp session={session} segs={segs} />;
}
