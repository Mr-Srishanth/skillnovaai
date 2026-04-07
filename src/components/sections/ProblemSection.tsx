import { motion } from "framer-motion";

const lines = ["Courses completed...", "Certificates earned...", "Still... no direction."];

const ProblemSection = () => (
  <section className="scene-section">
    <div className="relative z-10 text-center px-6 max-w-3xl space-y-10">
      {lines.map((line, i) => (
        <motion.p
          key={i}
          initial={{ opacity: 0, x: i % 2 === 0 ? -60 : 60 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: i * 0.4, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.5 }}
          className={`text-2xl md:text-5xl font-display font-semibold ${
            i === 2 ? "gradient-text" : "text-foreground"
          }`}
        >
          {line}
        </motion.p>
      ))}
    </div>
  </section>
);

export default ProblemSection;
