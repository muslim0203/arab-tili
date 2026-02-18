import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Headphones, BookOpen, PenLine, Mic, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const MODULES = [
  { key: "grammar", icon: FileText },
  { key: "listening", icon: Headphones },
  { key: "reading", icon: BookOpen },
  { key: "writing", icon: PenLine },
  { key: "speaking", icon: Mic },
] as const;

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function ExamModules() {
  const { t } = useTranslation();

  return (
    <section className="bg-white py-20 sm:py-28" aria-labelledby="exam-modules-heading">
      <div className="container mx-auto px-4">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 id="exam-modules-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("examModules.title")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("examModules.subtitle")}
          </p>
        </motion.div>

        <motion.div
          className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-5"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          {MODULES.map((mod) => (
            <motion.article
              key={mod.key}
              variants={item}
              className={cn(
                "group rounded-2xl border border-border bg-card p-6 shadow-sm",
                "transition-all duration-300 hover:shadow-md hover:border-primary/20",
                "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
              )}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                <mod.icon className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{t(`examModules.${mod.key}`)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(`examModules.${mod.key}Desc`)}</p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
