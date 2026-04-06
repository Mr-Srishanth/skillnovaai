import { motion } from "framer-motion";
import { useState } from "react";
import { validateSkills, validateRole } from "@/lib/validation";

interface Props {
  onAnalyze: (skills: string, role: string) => void;
  isLoading: boolean;
}

const UserInputSection = ({ onAnalyze, isLoading }: Props) => {
  const [skills, setSkills] = useState("");
  const [role, setRole] = useState("");
  const [skillsError, setSkillsError] = useState("");
  const [roleError, setRoleError] = useState("");

  const handleSubmit = () => {
    const sv = validateSkills(skills);
    const rv = validateRole(role);
    setSkillsError(sv.valid ? "" : sv.error || "");
    setRoleError(rv.valid ? "" : rv.error || "");
    if (sv.valid && rv.valid) {
      onAnalyze(skills, role);
    }
  };

  return (
    <section className="scene-section" id="analyze">
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
        className="relative z-10 w-full max-w-xl px-6"
      >
        <div className="glass-card p-8 md:p-12 box-glow-blue space-y-8">
          <h3 className="text-2xl md:text-3xl font-display font-bold text-center gradient-text">
            Your Analysis
          </h3>

          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <label className="block text-sm text-muted-foreground mb-2 font-medium">Your Current Skills</label>
            <input
              type="text"
              value={skills}
              onChange={(e) => { setSkills(e.target.value); setSkillsError(""); }}
              placeholder="e.g. Python, SQL, React, JavaScript"
              className={`w-full bg-muted/50 border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-all ${
                skillsError ? "border-destructive focus:ring-destructive/50" : "border-border focus:ring-primary/50"
              }`}
            />
            {skillsError && (
              <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive mt-2">
                {skillsError}
              </motion.p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            viewport={{ once: true }}
          >
            <label className="block text-sm text-muted-foreground mb-2 font-medium">Your Dream Role</label>
            <input
              type="text"
              value={role}
              onChange={(e) => { setRole(e.target.value); setRoleError(""); }}
              placeholder="e.g. Full Stack Developer"
              className={`w-full bg-muted/50 border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-all ${
                roleError ? "border-destructive focus:ring-destructive/50" : "border-border focus:ring-primary/50"
              }`}
            />
            {roleError && (
              <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive mt-2">
                {roleError}
              </motion.p>
            )}
          </motion.div>

          <motion.button
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.03, boxShadow: "0 0 30px hsl(217 91% 60% / 0.5)" }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full py-4 rounded-lg font-display font-bold text-lg bg-gradient-to-r from-primary to-accent text-primary-foreground disabled:opacity-40 transition-all"
          >
            {isLoading ? "Analyzing..." : "Analyze My Future"}
          </motion.button>
        </div>
      </motion.div>
    </section>
  );
};

export default UserInputSection;
