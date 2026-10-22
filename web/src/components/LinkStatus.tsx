import { RetryLink } from "@/components/RetryLink";
import type { Locale } from "@/i18n/config";
import { fill } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries/en";
import type { ProductRow } from "@/lib/data";
import { dateTime } from "@/lib/format";
import { errorReason, lastReadFailed, linkState } from "@/lib/link-status";

// "Pending" / "Couldn't read" next to a pasted link; tracked links need no label.
export function LinkStatusPill({ product, t }: { product: ProductRow; t: Dict }) {
  const state = linkState(product);
  if (state !== "pending" && state !== "failed") return null;
  const failed = state === "failed";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
        failed ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn"
      }`}
    >
      <span className={`size-1.5 rounded-full ${failed ? "bg-bad" : "bg-warn"}`} aria-hidden />
      {failed ? t.linkStatus.failed : t.linkStatus.pending}
    </span>
  );
}

// Why a pasted link has no fresh price, with "Try again" for its owner once the scraper gave up.
export function LinkStatusNote({ product, t, lang }: { product: ProductRow; t: Dict; lang: Locale }) {
  const state = linkState(product);
  if (!state) return null;
  const failedRead = lastReadFailed(product);
  const last = failedRead
    ? { date: dateTime(product.last_checked_at!, lang), reason: errorReason(product.last_error!, t.linkStatus) }
    : null;

  if (state === "failed") {
    return (
      <div role="status" className="mt-6 rounded-xl border border-line bg-bad-soft px-4 py-3 text-sm text-ink">
        <p className="font-medium text-bad">{t.linkStatus.failedTitle}</p>
        {last && <p className="mt-1">{fill(t.linkStatus.failedText, last)}</p>}
        <RetryLink productId={product.id} />
      </div>
    );
  }
  if (state === "pending") {
    return (
      <div role="status" className="mt-6 rounded-xl border border-line bg-accent-soft px-4 py-3 text-sm text-ink">
        <p>{t.product.pending}</p>
        {last && <p className="mt-1 text-muted">{fill(t.linkStatus.lastTry, last)}</p>}
      </div>
    );
  }
  if (!last) return null;
  return (
    <p role="status" className="mt-6 rounded-xl border border-line bg-warn-soft px-4 py-3 text-sm text-ink">
      {fill(t.linkStatus.checkFailed, last)}
    </p>
  );
}
