import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function Hero() {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden bg-white pt-12 pb-20 sm:pt-20 sm:pb-28 lg:pt-28 lg:pb-36">
      <div className="container mx-auto grid gap-12 px-4 lg:grid-cols-2 lg:gap-16 lg:items-center">
        <div className="max-w-xl">
          <motion.h1
            className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {t("hero.title")}
          </motion.h1>
          <motion.p
            className="mt-6 text-lg text-muted-foreground sm:text-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            {t("hero.subtitle")}
          </motion.p>
          <motion.p
            className="mt-4 text-muted-foreground"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {t("hero.description")}
          </motion.p>
          <motion.div
            className="mt-10 flex flex-wrap gap-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <Button asChild size="lg" className="rounded-xl px-8 shadow-lg hover:shadow-xl transition-shadow focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              <Link to="/register">{t("hero.ctaPrimary")}</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl px-8 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              <Link to="/#pricing">{t("hero.ctaSecondary")}</Link>
            </Button>
          </motion.div>
        </div>

        <motion.div
          className="relative flex justify-center lg:justify-end"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-white shadow-2xl shadow-primary/10 overflow-hidden"
            aria-hidden
          >
            {/* Window header */}
            <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
            </div>

            {/* Window body */}
            <div className="p-6 space-y-6">
              {/* Question Header */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                  <span>Grammatika bo'limi</span>
                  <span className="text-primary font-semibold">04:59</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary w-[35%] rounded-full" />
                </div>
              </div>

              {/* Arabic Text Question */}
              <div className="space-y-4">
                <p className="text-right text-2xl font-arabic font-medium text-foreground leading-relaxed" dir="rtl">
                  أين _____ الطالبُ كتابَهُ؟
                </p>
                <div className="space-y-3">
                  {[
                    "وضَعَ",
                    "وضَعَتْ",
                    "وضَعُوا",
                    "يضَعُ"
                  ].map((option, i) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-xl border-2 transition-colors ${i === 0 ? "border-primary bg-primary/5" : "border-border"}`}>
                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${i === 0 ? "border-primary" : "border-muted-foreground"}`}>
                        {i === 0 && <div className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <span className="font-arabic text-lg text-foreground font-medium" dir="rtl">{option}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <div className="h-11 w-full rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20 flex items-center justify-center font-medium text-sm gap-2">
                  Keyingi savol
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
