import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Repeat } from "lucide-react";
import type { KnowledgePack } from "@/lib/knowledge";

const priorityStyle: Record<string, string> = {
  high: "text-destructive border-destructive/40",
  medium: "text-accent border-accent/40",
  low: "text-muted-foreground border-border",
};

const FlashcardDeck = ({ cards }: { cards: KnowledgePack["flashcards"] }) => {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());

  if (!cards.length) return null;
  const card = cards[i];

  const go = (d: number) => {
    setFlipped(false);
    setI((v) => (v + d + cards.length) % cards.length);
  };

  const mark = (isKnown: boolean) => {
    setKnown((s) => {
      const n = new Set(s);
      if (isKnown) n.add(i); else n.delete(i);
      return n;
    });
    go(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Card {i + 1} of {cards.length}</span>
        <span>{known.size} marked as known</span>
      </div>

      <div className="relative h-64 [perspective:1400px]" onClick={() => setFlipped((f) => !f)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${i}-${flipped}`}
            initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="glass-card absolute inset-0 p-8 flex flex-col items-center justify-center text-center cursor-pointer card-shine"
          >
            <span className={`absolute top-4 right-4 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${priorityStyle[card.priority] || ""}`}>
              {card.priority} priority
            </span>
            <span className="absolute top-4 left-4 text-[10px] uppercase tracking-wide text-muted-foreground">
              {card.category}
            </span>
            <p className={`font-display ${flipped ? "text-base text-foreground" : "text-xl font-bold text-foreground"}`}>
              {flipped ? card.answer : card.question}
            </p>
            <p className="text-[11px] text-muted-foreground mt-6 flex items-center gap-1">
              <Repeat className="w-3 h-3" /> Tap to {flipped ? "see question" : "reveal answer"}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => go(-1)} className="p-2 rounded-lg glass-card text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={() => mark(false)} className="flex-1 py-2 rounded-lg glass-card text-xs text-muted-foreground hover:text-foreground">
          Still learning
        </button>
        <button onClick={() => mark(true)} className="flex-1 py-2 rounded-lg bg-primary/15 border border-primary/40 text-xs text-primary">
          I know this
        </button>
        <button onClick={() => go(1)} className="p-2 rounded-lg glass-card text-muted-foreground hover:text-foreground">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default FlashcardDeck;
