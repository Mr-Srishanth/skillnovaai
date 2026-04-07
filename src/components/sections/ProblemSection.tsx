import { motion } from "framer-motion";

const lines = [
  { text: "Courses completed...", delay: 0.5 },
  { text: "Certificates earned...", delay: 1.2 },
  { text: "Still... no direction.", delay: 2.0 },
];

const ProblemSection = () => (
  <section className="scene-section">
    <div className="relative z-10 text-center px-6 max-w-3xl space-y-10">
      {lines.map((line, i) => (
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: line.delay, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.5 }}
          className={`text-2xl md:text-5xl font-display font-semibold ${
            i === 2 ? "gradient-text" : "text-foreground"
          }`}
        >
          {line.text}
        </motion.p>
      ))}
    </div>
  </section>
);

export default ProblemSection;
