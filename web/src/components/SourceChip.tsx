import type { Dict } from "@/i18n/dictionaries/en";
import { sourceLabel } from "@/lib/format";

// One soft color per data source, so a long list is easy to scan.
const TONES: Record<string, string> = {
  "books-toscrape": "bg-books-soft text-books",
  coingecko: "bg-crypto-soft text-crypto",
  tcmb: "bg-fx-soft text-fx",
  gold: "bg-gold-soft text-gold",
  custom: "bg-custom-soft text-custom",
};

export const sourceTone = (source: string) => TONES[source] ?? "bg-hover text-muted";

export function SourceChip({ source, t }: { source: string; t: Dict }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${sourceTone(source)}`}>
      {sourceLabel(source, t)}
    </span>
  );
}
