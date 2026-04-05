import { motion } from "framer-motion";

export interface AnalysisResult {
  missingSkills: string[];
  recommendedLearning: string[];
  roadmap: string[];
}

const ResultSection = ({ result }: { result: AnalysisResult | null }) => {
  if (!result) return null;

  const cards = [
    { title: "Missing Skills", items: result.missingSkills, glow: "box-glow-blue" },
    { title: "Recommended Learning", items: result.recommendedLearning, glow: "box-glow-purple" },
    { title: "Your Roadmap", items: result.roadmap, glow: "box-glow-blue", isRoadmap: true },
  ];

  return (
    <section className="scene-section !min-h-0 py-24">
      <div className="relative z-10 w-full max-w-5xl px-6 space-y-12">
        {cards.map((card, ci) => (
          <motion.div
            key={ci}
            initial={{ opacity: 0, x: ci % 2 === 0 ? -80 : 80 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: ci * 0.2 }}
            viewport={{ once: true, amount: 0.3 }}
            className={`glass-card p-8 ${card.glow}`}
          >
            <h4 className="text-xl md:text-2xl font-display font-bold gradient-text mb-6">
              {card.title}
            </h4>
            <ul className="space-y-3">
              {card.items.map((item, ii) => (
                <motion.li
                  key={ii}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: ii * 0.15 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-3 text-foreground/90"
                >
                  <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    card.isRoadmap ? "bg-primary" : "bg-accent"
                  }`} />
                  <span>{card.isRoadmap ? `Step ${ii + 1}: ${item}` : item}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default ResultSection;
