import { motion } from "framer-motion";
import {
  Home, Brain, Bot, FileText, Telescope, Clock, GitCompare,
  Mic, Hammer, Menu, X, LogOut, ArrowLeft, BookOpen,
  Route, Gauge, Lightbulb, Building2, Banknote, TrendingUp,
  Briefcase, BadgeCheck, Compass, ListChecks, LineChart, Shuffle, Sparkles
} from "lucide-react";
import { useState } from "react";
import type { DashboardTab } from "@/pages/Dashboard";
import GamificationWidget from "./GamificationWidget";

interface Props {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  displayName: string;
  onSignOut: () => void;
  userId: string;
}

const groups: { label: string; items: { id: DashboardTab; label: string; icon: typeof Home }[] }[] = [
  {
    label: "Core",
    items: [
      { id: "overview", label: "Overview", icon: Home },
      { id: "analyze", label: "Analyze", icon: Brain },
      { id: "roadmap", label: "Roadmap", icon: Route },
      { id: "plan", label: "Daily Plan", icon: ListChecks },
      { id: "knowledge", label: "Knowledge", icon: BookOpen },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { id: "readiness", label: "Readiness", icon: Gauge },
      { id: "hiring", label: "Hiring", icon: Briefcase },
      { id: "companyfit", label: "Company Fit", icon: Building2 },
      { id: "verify", label: "Verify Skills", icon: BadgeCheck },
      { id: "opportunities", label: "Opportunities", icon: Compass },
      { id: "pathsim", label: "Path Simulator", icon: Shuffle },
      { id: "analytics", label: "Analytics", icon: LineChart },
      { id: "insights", label: "Insights", icon: Lightbulb },
      { id: "companies", label: "Companies", icon: Building2 },
      { id: "salary", label: "Salary", icon: Banknote },
      { id: "trends", label: "Trends", icon: TrendingUp },
    ],
  },
  {
    label: "Tools",
    items: [
      { id: "mentor", label: "AI Mentor", icon: Bot },
      { id: "resume", label: "Resume ATS", icon: FileText },
      { id: "simulator", label: "Simulator", icon: Telescope },
      { id: "interview", label: "Interview", icon: Mic },
      { id: "projectintel", label: "Project Intelligence", icon: Sparkles },
      { id: "projects", label: "Project Studio", icon: Hammer },
      { id: "history", label: "History", icon: Clock },
      { id: "compare", label: "Compare", icon: GitCompare },
    ],
  },
];

const DashboardSidebar = ({ activeTab, onTabChange, displayName, onSignOut, userId }: Props) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="p-5 border-b border-sidebar-border">
        <h1 className="text-lg font-display font-bold gradient-text">SkillNova AI</h1>
        <p className="text-xs text-muted-foreground mt-1 truncate">{displayName || "Explorer"}</p>
      </div>

      <GamificationWidget userId={userId} />

      <nav className="flex-1 px-3 py-2 space-y-3 overflow-y-auto scroll-dark">
        {groups.map((group) => (
          <div key={group.label} className="space-y-0.5">
            <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground/60 font-display">
              {group.label}
            </p>
            {group.items.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => { onTabChange(tab.id); setMobileOpen(false); }}
                  whileHover={{ x: 3 }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-sm relative ${
                    active
                      ? "text-foreground font-medium bg-muted/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="sidebar-glow"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                      style={{ background: 'linear-gradient(180deg, hsl(186,94%,55%), hsl(270,60%,55%))' }}
                    />
                  )}
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </motion.button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-1">
        <a
          href="/"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground px-3 py-2 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> Back to experience
        </a>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive px-3 py-2 text-left transition-colors"
        >
          <LogOut className="w-3 h-3" /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg glass-card"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-sidebar flex flex-col border-r border-sidebar-border overflow-hidden">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 p-1">
              <X className="w-4 h-4" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop */}
      <aside className="w-60 h-screen sticky top-0 overflow-hidden bg-sidebar border-r border-sidebar-border flex-col shrink-0 hidden md:flex">
        {sidebarContent}
      </aside>
    </>
  );
};

export default DashboardSidebar;
