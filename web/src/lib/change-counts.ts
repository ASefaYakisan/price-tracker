// The price drop / rise figures above the list: products whose last two readings differ.
// A product without two readings (pending, unreadable or brand new) counts as neither.
type Priced = { price: number | null; previous_price: number | null };

export function changeCounts(items: Priced[]) {
  let drops = 0;
  let rises = 0;
  for (const p of items) {
    if (p.price == null || p.previous_price == null || p.previous_price === 0) continue;
    const pct = ((p.price - p.previous_price) / p.previous_price) * 100;
    if (Math.abs(pct) < 0.005) continue; // same threshold as the row badge (ChangeBadge)
    if (pct < 0) drops++;
    else rises++;
  }
  return { drops, rises };
}
