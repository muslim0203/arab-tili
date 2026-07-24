import { Info } from "lucide-react";
import { SarfConjugationTable } from "./SarfConjugationTable";
import type { SarfBlock, SarfConjTable } from "@/lib/sarf-types";

interface SarfTheoryBlocksProps {
  blocks: SarfBlock[];
  tables: SarfConjTable[];
}

export function SarfTheoryBlocks({ blocks, tables }: SarfTheoryBlocksProps) {
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading":
            return (
              <h2
                key={i}
                className="pt-2 text-lg font-bold tracking-tight text-foreground sm:text-xl"
              >
                {block.text}
              </h2>
            );

          case "paragraph":
            return (
              <p key={i} className="leading-relaxed text-foreground/90">
                {block.text}
              </p>
            );

          case "note":
            return (
              <div
                key={i}
                className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"
              >
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-200">
                  {block.text}
                </p>
              </div>
            );

          case "example":
            return (
              <div
                key={i}
                className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 text-center"
              >
                <p
                  className="font-arabic text-3xl leading-relaxed text-foreground sm:text-4xl"
                  dir="rtl"
                >
                  {block.arabic}
                </p>
                {block.translit && (
                  <p className="mt-2 text-sm italic text-muted-foreground">{block.translit}</p>
                )}
                {block.meaning && (
                  <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    {block.meaning}
                  </p>
                )}
              </div>
            );

          case "tableRef": {
            const table = tables.find((t) => t.id === block.tableId);
            if (!table) return null;
            return <SarfConjugationTable key={i} table={table} />;
          }

          default:
            return null;
        }
      })}
    </div>
  );
}
