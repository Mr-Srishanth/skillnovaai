import { motion } from "framer-motion";

const lines = ["No more confusion.", "No more guessing.", "Just clarity."];

const ImpactSection = () => (
  <section className="scene-section">
    <div className="relative z-10 text-center px-6 max-w-3xl space-y-10">
      {lines.map((line, i) => (
        <motion.p
          key={i}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: i * 0.5 }}
          viewport={{ once: true }}
          className={`text-2xl md:text-5xl font-display font-bold ${
            i === 2 ? "gradient-text" : "text-foreground"
          }`}
        >
          {line}
        </motion.p>
      ))}
    </div>
  </section>
);

export default ImpactSection;
