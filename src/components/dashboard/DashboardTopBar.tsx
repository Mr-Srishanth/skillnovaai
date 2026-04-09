import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";

interface Props {
  displayName: string;
}

const DashboardTopBar = ({ displayName }: Props) => {
  const [showBanner, setShowBanner] = useState(true);

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-center gap-2 py-2 px-4 text-xs"
              style={{ background: 'linear-gradient(90deg, rgba(34,211,238,0.08), rgba(124,58,237,0.08))' }}
            >
              <Sparkles className="w-3 h-3 text-neon-cyan" />
              <span className="gradient-text font-medium">Optimized for YOU using AI</span>
              <button onClick={() => setShowBanner(false)} className="ml-2 text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DashboardTopBar;
