import { Fragment } from "react";
import { cn } from "@/lib/utils";
import type { SarfConjTable } from "@/lib/sarf-types";

interface SarfConjugationTableProps {
  table: SarfConjTable;
  className?: string;
}

/** Katakda arabcha harflar bormi? */
function isArabic(text: string): boolean {
  return /[؀-ۿ]/.test(text);
}

/**
 * Arabcha katak matnini render qiladi. `highlight` bo'lsa (masalan ta'nis tosi تْ
 * yoki fatha ‑َ), matndagi shu bo'lakni emerald rangda ajratib ko'rsatadi.
 */
function ArabicCell({ text, highlight }: { text: string; highlight?: string }) {
  if (!highlight || !text.includes(highlight)) {
    return <span>{text}</span>;
  }
  const parts = text.split(highlight);
  return (
    <span>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <span className="rounded bg-emerald-500/15 px-0.5 text-emerald-600 dark:text-emerald-400">
              {highlight}
            </span>
          )}
        </Fragment>
      ))}
    </span>
  );
}

export function SarfConjugationTable({ table, className }: SarfConjugationTableProps) {
  return (
    <figure className={cn("my-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm", className)}>
      <figcaption className="flex flex-col gap-1 border-b border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-semibold text-foreground" dir="rtl">
          <span className="font-arabic">{table.title}</span>
        </span>
        {table.rootArabic && (
          <span
            className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-base font-arabic text-primary"
            dir="rtl"
          >
            {table.rootArabic}
          </span>
        )}
      </figcaption>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              {table.columns.map((col, i) => (
                <th
                  key={i}
                  className="whitespace-nowrap px-3 py-2.5 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => (
              <tr
                key={ri}
                className="border-b border-border/60 last:border-0 transition-colors hover:bg-muted/30"
              >
                {row.cells.map((cell, ci) => {
                  const arabic = isArabic(cell);
                  return (
                    <td
                      key={ci}
                      dir={arabic ? "rtl" : undefined}
                      className={cn(
                        "px-3 py-2.5 align-middle",
                        arabic
                          ? "font-arabic text-xl leading-relaxed text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {arabic ? <ArabicCell text={cell} highlight={row.highlight} /> : cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
