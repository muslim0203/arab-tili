import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Zap,
  Shuffle,
  Timer,
  ShieldCheck,
  LayoutDashboard,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURE_KEYS = [
  { key: "autoScoring", icon: Zap },
  { key: "randomBank", icon: Shuffle },
  { key: "timer", icon: Timer },
  { key: "antiCheat", icon: ShieldCheck },
  { key: "teacherDashboard", icon: LayoutDashboard },
  { key: "pdfCert", icon: FileCheck },
] as const;

export function KeyFeatures() {
  const { t } = useTranslation();

  return (
    <section className="bg-white py-20 sm:py-28" aria-labelledby="key-features-heading">
      <div className="container mx-auto px-4">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 id="key-features-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("keyFeatures.title")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("keyFeatures.subtitle")}
          </p>
        </motion.div>

        <motion.ul
          className="mx-auto mt-16 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.06 } },
          }}
        >
          {FEATURE_KEYS.map((f) => (
            <motion.li
              key={f.key}
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              className={cn(
                "flex gap-4 rounded-xl border border-border bg-card p-5 shadow-sm",
                "transition-all duration-300 hover:shadow-md hover:border-primary/10",
                "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{t(`keyFeatures.${f.key}`)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(`keyFeatures.${f.key}Desc`)}</p>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
