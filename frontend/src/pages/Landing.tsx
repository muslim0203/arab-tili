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
import { SEO } from "@/components/SEO";
import {
  StructuredData,
  organizationSchema,
  websiteSchema,
  buildFAQSchema,
} from "@/components/StructuredData";

const FAQ_SCHEMA_ITEMS = [
  {
    question: "Arab CEFR imtihoni nima?",
    answer:
      "Bu arab tili bilimini Yevropa til referens ramkasi (A1–C2) ga mos baholash. Platformamiz rasmiy arab tili testlariga format va qiyinlik jihatidan o'xshash mock imtihonlar taklif etadi.",
  },
  {
    question: "To'liq imtihon qancha vaqt oladi?",
    answer:
      "To'liq mock imtihon (listening, reading, writing, speaking) odatda 90–120 daqiqa, daraja va vazifalar soniga qarab.",
  },
  {
    question: "Ball avtomatik hisoblanadimi?",
    answer:
      "Ha. Ko'p tanlovli va ko'p ochiq vazifalar avtomatik balllanadi. Writing va speaking AI rubrikalari bilan ballanadi.",
  },
  {
    question: "Sertifikat olish mumkinmi?",
    answer:
      "Ha. Mock imtihonni tugatgach, CEFR balli va PDF sertifikatni yuklab olish imkoniyati beriladi.",
  },
  {
    question: "Muassasalar uchun qo'llab-quvvatlaysizmi?",
    answer:
      "Ha. Center tarifi o'qituvchi paneli, ommaviy foydalanuvchi boshqaruvi va ixtiyoriy brendingni o'z ichiga oladi.",
  },
  {
    question: "Qanday to'lov usullarini qabul qilasiz?",
    answer:
      "Asosiy kartalar va mahalliy to'lov tizimlari (masalan, O'zbekistonda Click) qabul qilinadi.",
  },
];

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
      <SEO
        isHome
        title="Arab Exam – Arab tili CEFR imtihon platformasi"
        description="A1 dan C2 gacha arab tili bilimini mock imtihon, AI baholash va CEFR sertifikat bilan tekshiring. Listening, reading, writing, speaking."
        canonicalPath="/"
        lang={i18n.language}
      />
      <StructuredData data={organizationSchema} />
      <StructuredData data={websiteSchema} />
      <StructuredData data={buildFAQSchema(FAQ_SCHEMA_ITEMS)} />
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

