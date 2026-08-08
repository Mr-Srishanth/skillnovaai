import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

const CopyButton = ({ value, label = "Copy" }: { value: string; label?: string }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          toast.error("Clipboard unavailable in this browser");
        }
      }}
      className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md glass-card text-muted-foreground hover:text-foreground transition-colors"
    >
      {done ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {done ? "Copied" : label}
    </button>
  );
};

export default CopyButton;
