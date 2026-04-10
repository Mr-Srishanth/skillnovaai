import { motion } from "framer-motion";
import { Brain, FileText, Telescope, Mic, Code2, Gamepad2, TrendingUp, Bot } from "lucide-react";

const features = [
  { icon: Brain, title: "Skill Gap Analyzer", desc: "AI analyzes your skills against your dream role and gives a readiness score with a clear improvement roadmap.", color: "text-neon-cyan" },
  { icon: Bot, title: "AI Career Mentor", desc: "Get personalized guidance from an AI mentor that understands your goals, skills, and career trajectory.", color: "text-neon-purple" },
  { icon: FileText, title: "Resume ATS Analyzer", desc: "Upload your resume and get an ATS compatibility score with actionable feedback to pass automated screening.", color: "text-neon-blue" },
  { icon: Telescope, title: "Career Simulator", desc: "Simulate your career path based on daily study hours and see salary projections and job readiness timelines.", color: "text-green-400" },
  { icon: Mic, title: "Mock Interview", desc: "Practice with AI-generated interview questions and receive scored feedback on clarity and confidence.", color: "text-yellow-400" },
  { icon: Code2, title: "Project Generator", desc: "Get AI-powered project ideas with tech stacks and step-by-step plans tailored to your chosen domain.", color: "text-neon-cyan" },
  { icon: Gamepad2, title: "Gamification", desc: "Earn XP, unlock levels, maintain streaks, and collect badges as you progress through your career journey.", color: "text-neon-purple" },
  { icon: TrendingUp, title: "Smart Insights", desc: "Get motivational insights like 'You're ahead of 70% of learners' and personalized next-step recommendations.", color: "text-green-400" },
];

const FeaturesSection = () => (
  <section className="py-24 px-6 relative overflow-hidden">
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <p className="text-xs font-display font-bold uppercase tracking-[0.3em] text-neon-cyan mb-4">Everything You Need</p>
        <h2 className="text-3xl md:text-5xl font-display font-black text-foreground">
          One System. <span className="gradient-text">Total Career Control.</span>
        </h2>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            viewport={{ once: true }}
            className="glass-card-hover card-shine p-6 group"
          >
            <f.icon className={`w-8 h-8 ${f.color} mb-4 transition-transform duration-300 group-hover:scale-110`} />
            <h3 className="font-display font-bold text-sm text-foreground mb-2">{f.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
