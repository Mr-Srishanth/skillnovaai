import { motion } from "framer-motion";
import type { DashboardTab } from "@/pages/Dashboard";

interface Props {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  displayName: string;
  onSignOut: () => void;
}

const tabs: { id: DashboardTab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "🏠" },
  { id: "analyze", label: "Analyze", icon: "🧠" },
  { id: "mentor", label: "AI Mentor", icon: "🤖" },
  { id: "resume", label: "Resume ATS", icon: "📄" },
  { id: "simulator", label: "Simulator", icon: "🔮" },
  { id: "history", label: "History", icon: "📋" },
  { id: "compare", label: "Compare", icon: "⚖️" },
];

const DashboardSidebar = ({ activeTab, onTabChange, displayName, onSignOut }: Props) => {
  return (
    <aside className="w-64 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col shrink-0 hidden md:flex">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-display font-bold gradient-text">SkillNova AI</h1>
        <p className="text-sm text-muted-foreground mt-1 truncate">
          {displayName || "Explorer"}
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            whileHover={{ x: 4 }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
              activeTab === tab.id
                ? "bg-primary/15 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-sm">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div
                layoutId="sidebar-active"
                className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
              />
            )}
          </motion.button>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-2">
        <a
          href="/"
          className="block text-sm text-muted-foreground hover:text-foreground px-4 py-2 transition-colors"
        >
          ← Back to experience
        </a>
        <button
          onClick={onSignOut}
          className="w-full text-sm text-muted-foreground hover:text-destructive px-4 py-2 text-left transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
