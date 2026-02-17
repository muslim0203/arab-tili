import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const LOGOS = [
  { name: "Partner 1", width: 120 },
  { name: "Partner 2", width: 100 },
  { name: "Partner 3", width: 140 },
  { name: "Partner 4", width: 110 },
  { name: "Partner 5", width: 130 },
  { name: "Partner 6", width: 90 },
];

export function TrustedBy() {
  const { t } = useTranslation();
  return (
    <section className="border-y border-border bg-muted/30 py-12 sm:py-16" aria-labelledby="trusted-by-heading">
      <div className="container mx-auto px-4">
        <motion.p
          id="trusted-by-heading"
          className="text-center text-sm font-medium uppercase tracking-wider text-muted-foreground mb-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.4 }}
        >
          {t("trustedBy")}
        </motion.p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 sm:gap-x-16">
          {LOGOS.map((logo, i) => (
            <motion.div
              key={logo.name}
              className="flex h-10 items-center justify-center rounded-lg bg-white px-6 py-2 shadow-sm border border-border"
              style={{ minWidth: logo.width }}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <span className="text-sm font-semibold text-muted-foreground">{logo.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
