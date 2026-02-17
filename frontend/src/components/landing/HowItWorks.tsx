import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, ClipboardList, FileCheck, Award } from "lucide-react";

const STEPS = [
  { key: "step1", icon: ClipboardList },
  { key: "step2", icon: FileCheck },
  { key: "step3", icon: Award },
] as const;

export function HowItWorks() {
  const { t } = useTranslation();

  return (
    <section className="border-t border-border bg-muted/20 py-20 sm:py-28" aria-labelledby="how-it-works-heading">
      <div className="container mx-auto px-4">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 id="how-it-works-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("howItWorks.title")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("howItWorks.subtitle")}
          </p>
        </motion.div>

        <div className="mx-auto mt-16 max-w-4xl">
          <div className="grid gap-10 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <motion.article
                key={step.key}
                className="relative text-center sm:text-left"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="flex justify-center sm:justify-start">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                    <step.icon className="h-7 w-7" aria-hidden />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-sm font-medium text-primary">
                    {t("howItWorks.stepLabel", { number: index + 1 })}
                  </span>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">{t(`howItWorks.${step.key}`)}</h3>
                  <p className="mt-2 text-muted-foreground">{t(`howItWorks.${step.key}Desc`)}</p>
                </div>
                {index < STEPS.length - 1 && (
                  <div className="absolute right-0 top-7 hidden sm:block" aria-hidden>
                    <ArrowRight className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                )}
              </motion.article>
            ))}
          </div>
          <motion.div
            className="mt-14 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <Button asChild size="lg" className="rounded-xl shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              <Link to="/register">{t("howItWorks.cta")}</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
