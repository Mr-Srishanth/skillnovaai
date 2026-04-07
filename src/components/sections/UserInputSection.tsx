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
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="relative z-10 w-full max-w-xl px-6"
      >
        <div className="glass-card box-glow-cyan space-y-8">
          <h3 className="text-2xl md:text-3xl font-display font-bold text-center gradient-text">
            Your Analysis
          </h3>

          {/* Skills input — 0.3s delay */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <label className="block text-sm text-muted-foreground mb-2 font-medium">Your Current Skills</label>
            <input
              type="text"
              value={skills}
              onChange={(e) => { setSkills(e.target.value); setSkillsError(""); }}
              placeholder="e.g. Python, SQL, React, JavaScript"
              className={`scene-input ${skillsError ? "error" : ""}`}
            />
            {skillsError && (
              <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive mt-2">
                {skillsError}
              </motion.p>
            )}
          </motion.div>

          {/* Role input — 0.6s delay */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            viewport={{ once: true }}
          >
            <label className="block text-sm text-muted-foreground mb-2 font-medium">Your Dream Role</label>
            <input
              type="text"
              value={role}
              onChange={(e) => { setRole(e.target.value); setRoleError(""); }}
              placeholder="e.g. Full Stack Developer"
              className={`scene-input ${roleError ? "error" : ""}`}
            />
            {roleError && (
              <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive mt-2">
                {roleError}
              </motion.p>
            )}
          </motion.div>

          {/* CTA button — 0.9s delay, pulse glow */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            viewport={{ once: true }}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl font-display font-bold text-lg bg-primary text-primary-foreground disabled:opacity-40 transition-all animate-btn-pulse"
            >
              {isLoading ? "Analyzing..." : "Analyze My Future"}
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default UserInputSection;
