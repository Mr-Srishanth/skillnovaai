import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AnimatedBackground from "@/components/AnimatedBackground";
import HeroSection from "@/components/sections/HeroSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import SocialProofSection from "@/components/sections/SocialProofSection";
import UserInputSection from "@/components/sections/UserInputSection";
import ProcessingSection from "@/components/sections/ProcessingSection";
import ResultSection, { type AnalysisResult } from "@/components/sections/ResultSection";
import FinalCTASection from "@/components/sections/FinalCTASection";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleAnalyze = async (skills: string, role: string) => {
    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-skills", {
        body: { skills, role },
      });

      if (error) throw error;

      if (data?.validationFailed || data?.error) {
        toast.error(data.error || "Invalid input. Please try again.");
        return;
      }

      setResult(data as AnalysisResult);

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    } catch (e: any) {
      console.error(e);
      toast.error("Analysis failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background relative">
      <AnimatedBackground />
      <div className="relative z-10">
        <HeroSection />
        <FeaturesSection />
        <SocialProofSection />
        <UserInputSection onAnalyze={handleAnalyze} isLoading={isLoading} />
        <ProcessingSection visible={isLoading} />
        <div ref={resultRef}>
          <ResultSection result={result} />
        </div>
        <FinalCTASection />
      </div>
    </div>
  );
};

export default Index;
