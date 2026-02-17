import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5", "q6"] as const;

export function FAQ() {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="bg-white py-20 sm:py-28" aria-labelledby="faq-heading">
      <div className="container mx-auto px-4">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 id="faq-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("faq.title")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("faq.subtitle")}
          </p>
        </motion.div>

        <ul className="mx-auto mt-16 max-w-2xl space-y-3" role="list">
          {FAQ_KEYS.map((key, index) => (
            <motion.li
              key={key}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border border-border bg-card px-5 py-4 text-left shadow-sm",
                  "transition-colors hover:border-primary/20 hover:bg-muted/30",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                )}
                aria-expanded={openIndex === index}
                aria-controls={`faq-answer-${index}`}
                id={`faq-question-${index}`}
              >
                <span className="font-medium text-foreground">{t(`faq.${key}`)}</span>
                <ChevronDown
                  className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", openIndex === index && "rotate-180")}
                  aria-hidden
                />
              </button>
              <AnimatePresence initial={false}>
                {openIndex === index && (
                  <motion.div
                    id={`faq-answer-${index}`}
                    role="region"
                    aria-labelledby={`faq-question-${index}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <p className="border-x border-b border-border bg-muted/20 px-5 py-4 text-muted-foreground rounded-b-xl">
                      {t(`faq.a${key.slice(1)}`)}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
