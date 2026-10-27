// A product's currency is read from the page on every daily run. A page that hides it, or a shop that switches
// currency by the visitor's country (GitHub's servers are in the US), must not rewrite the saved value or put a
// price in another currency into the history that alerts compare against.

// saved: the currency stored for the product (or null); read: the currency found on the page (or null).
// accept: false means the reading is not saved. currency: what the product row keeps.
export function checkCurrency(saved, read) {
  const had = saved ? String(saved).toUpperCase() : null;
  const now = read ? String(read).toUpperCase() : null;
  if (!now) return { accept: true, currency: had };
  if (!had || had === now) return { accept: true, currency: now };
  return { accept: false, currency: had };
}

// One read result of a saved link, checked against the link's saved currency.
// A reading in another currency turns into a failed read with the reason `currency_changed`.
export function guardRead(result, savedCurrency) {
  if (!result.product) return result;
  const { accept, currency } = checkCurrency(savedCurrency, result.product.currency);
  if (!accept) {
    console.warn(`  ${result.product.url ?? 'link'}: page now shows ${result.product.currency}, saved ${currency}; reading skipped`);
    return { ...result, outcome: 'no_price', reason: 'currency_changed', product: null };
  }
  return { ...result, product: { ...result.product, currency } };
}
