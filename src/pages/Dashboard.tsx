import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AnimatedBackground from "@/components/AnimatedBackground";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardTopBar from "@/components/dashboard/DashboardTopBar";
import OverviewPanel from "@/components/dashboard/OverviewPanel";
import HistoryPanel from "@/components/dashboard/HistoryPanel";
import ComparisonPanel from "@/components/dashboard/ComparisonPanel";
import AnalyzePanel from "@/components/dashboard/AnalyzePanel";
import MentorPanel from "@/components/dashboard/MentorPanel";
import ResumePanel from "@/components/dashboard/ResumePanel";
import SimulatorPanel from "@/components/dashboard/SimulatorPanel";
import InterviewPanel from "@/components/dashboard/InterviewPanel";
import ProjectPanel from "@/components/dashboard/ProjectPanel";

export type DashboardTab = "overview" | "analyze" | "mentor" | "resume" | "simulator" | "history" | "compare" | "interview" | "projects";

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
      });
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground font-display animate-pulse-glow">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex relative">
      <AnimatedBackground />
      <DashboardSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        displayName={displayName}
        onSignOut={handleSignOut}
        userId={user.id}
      />
      <div className="flex-1 flex flex-col relative z-10">
        <DashboardTopBar displayName={displayName} />
        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {activeTab === "overview" && <OverviewPanel userId={user.id} displayName={displayName} />}
            {activeTab === "analyze" && <AnalyzePanel userId={user.id} />}
            {activeTab === "mentor" && <MentorPanel userId={user.id} userContext={{ goal: "", skills: "", score: null }} />}
            {activeTab === "resume" && <ResumePanel userId={user.id} />}
            {activeTab === "simulator" && <SimulatorPanel userId={user.id} />}
            {activeTab === "interview" && <InterviewPanel userId={user.id} />}
            {activeTab === "projects" && <ProjectPanel userId={user.id} />}
            {activeTab === "history" && <HistoryPanel userId={user.id} />}
            {activeTab === "compare" && <ComparisonPanel />}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
