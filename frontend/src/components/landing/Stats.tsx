import { motion, useMotionValue, useTransform, useSpring, useMotionValueEvent } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState("0");
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 50, damping: 30 });
  const rounded = useTransform(spring, (v) => Math.round(v) + suffix);
  const hasAnimated = useRef(false);

  useMotionValueEvent(rounded, "change", (v) => setDisplay(String(v)));

  useEffect(() => {
    if (!ref.current || hasAnimated.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          hasAnimated.current = true;
          motionValue.set(value);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, motionValue]);

  return <span ref={ref}>{display}</span>;
}

const STAT_KEYS = ["stats.exams", "stats.institutions", "stats.levels"] as const;
const STAT_VALUES = [
  { value: 10000, suffix: "+" },
  { value: 50, suffix: "+" },
  { value: 6, suffix: "" },
];

export function Stats() {
  const { t } = useTranslation();
  return (
    <section className="border-y border-border bg-muted/30 py-16 sm:py-20" aria-labelledby="stats-heading">
      <div className="container mx-auto px-4">
        <p id="stats-heading" className="sr-only">
          Platform statistics
        </p>
        <motion.div
          className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          {STAT_VALUES.map((stat, i) => (
            <div key={STAT_KEYS[i]} className="text-center">
              <p className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
                <CountUp value={stat.value} suffix={stat.suffix} />
              </p>
              <p className="mt-1 text-sm font-medium text-muted-foreground">{t(STAT_KEYS[i])}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
