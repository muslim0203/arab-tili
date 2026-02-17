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
            className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl shadow-primary/5"
            aria-hidden
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
              <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
              <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="p-6 space-y-4">
              <div className="h-4 max-w-[75%] rounded bg-muted" />
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-lg bg-muted/80" />
                ))}
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-muted/60" />
                <div className="h-3 max-w-[85%] rounded bg-muted/60" />
                <div className="h-3 max-w-[70%] rounded bg-muted/60" />
              </div>
              <div className="h-10 rounded-lg bg-primary/10 border border-primary/20" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
