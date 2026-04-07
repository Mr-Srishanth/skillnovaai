import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const FinalSection = () => {
  const { user } = useAuth();

  return (
    <>
      <section className="scene-section">
        <div className="relative z-10 text-center px-6 max-w-4xl space-y-8">
          {["Your future is not random...", "It's designed.", "Start building it today."].map((line, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, scale: 1.1 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, delay: i * 0.6 }}
              viewport={{ once: true }}
              className={`text-2xl md:text-5xl font-display font-bold ${
                i === 1 ? "gradient-text" : "text-foreground"
              }`}
            >
              {line}
            </motion.p>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 2 }}
            viewport={{ once: true }}
          >
            <Link
              to={user ? "/dashboard" : "/auth"}
              className="inline-block mt-6 px-8 py-4 rounded-xl font-display font-bold bg-gradient-to-r from-primary to-accent text-primary-foreground hover:scale-105 transition-transform"
            >
              {user ? "Go to Dashboard" : "Get Started"}
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="scene-section">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 2 }}
          viewport={{ once: true }}
          className="text-lg md:text-2xl font-display font-bold neon-glow-purple text-center px-6 max-w-3xl"
        >
          "We didn't just build a project… we built an experience."
        </motion.p>
      </section>
    </>
  );
};

export default FinalSection;
