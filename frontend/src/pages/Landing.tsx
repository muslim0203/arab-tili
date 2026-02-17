import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { TrustedBy } from "@/components/landing/TrustedBy";
import { Stats } from "@/components/landing/Stats";
import { ExamModules } from "@/components/landing/ExamModules";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { KeyFeatures } from "@/components/landing/KeyFeatures";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/landing/Footer";

export function Landing() {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  useEffect(() => {
    document.documentElement.setAttribute("dir", isRtl ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", i18n.language);
    return () => {
      document.documentElement.removeAttribute("dir");
      document.documentElement.setAttribute("lang", "uz");
    };
  }, [isRtl, i18n.language]);

  return (
    <div className="min-h-screen bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <LandingNav />
      <main>
        <Hero />
        <TrustedBy />
        <Stats />
        <ExamModules />
        <HowItWorks />
        <KeyFeatures />
        <Pricing />
        <FAQ />
        <Footer />
      </main>
    </div>
  );
}
