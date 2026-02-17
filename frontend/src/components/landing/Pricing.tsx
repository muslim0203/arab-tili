import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const PLAN_KEYS = [
  { key: "basic", href: "/register", highlighted: false },
  { key: "pro", href: "/#pricing", highlighted: true },
  { key: "center", href: "/yordam/boglanish", highlighted: false },
] as const;

export function Pricing() {
  const { t } = useTranslation();

  return (
    <section id="pricing" className="bg-muted/20 py-20 sm:py-28 scroll-mt-20" aria-labelledby="pricing-heading">
      <div className="container mx-auto px-4">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 id="pricing-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("pricing.title")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("pricing.subtitle")}
          </p>
        </motion.div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-8 lg:grid-cols-3">
          {PLAN_KEYS.map((plan, i) => {
            const features = t(`pricing.feat${plan.key.charAt(0).toUpperCase() + plan.key.slice(1)}`, {
              returnObjects: true,
            }) as string[];
            const hasPeriod = plan.key === "pro";
            return (
              <motion.article
                key={plan.key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className={cn(
                  "flex flex-col rounded-2xl border bg-card p-6 shadow-sm sm:p-8",
                  plan.highlighted
                    ? "border-primary shadow-lg ring-2 ring-primary/10"
                    : "border-border"
                )}
              >
                <h3 className="text-lg font-semibold text-foreground">{t(`pricing.${plan.key}`)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(`pricing.${plan.key}Desc`)}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight text-foreground">
                    {t(`pricing.${plan.key === "basic" ? "free" : plan.key === "pro" ? "premium" : "custom"}`)}
                  </span>
                  {hasPeriod && <span className="text-muted-foreground">{t("pricing.perMonth")}</span>}
                </div>
                <ul className="mt-6 flex-1 space-y-3" role="list">
                  {Array.isArray(features) && features.map((f, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Check className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  size="lg"
                  variant={plan.highlighted ? "default" : "outline"}
                  className={cn(
                    "mt-8 w-full rounded-xl focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    plan.highlighted && "shadow-sm"
                  )}
                >
                  <Link to={plan.href}>
                    {plan.key === "basic" ? t("pricing.startFree") : plan.key === "pro" ? t("pricing.getPro") : t("pricing.contactSales")}
                  </Link>
                </Button>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
