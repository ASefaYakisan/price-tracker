// One-off cleanup of products saved before titles and images were tidied (see clean-product.js):
// re-cleans every title and clears images that are logos or placeholders. The daily refresh re-reads real pictures.
// Dry run by default; `npm run fix-products -- --apply` writes the changes.
import { cleanTitle, isProductImage } from './clean-product.js';
import { createStore } from './store.js';

export function fixesFor(product) {
  const fixes = {};
  const title = cleanTitle(product.title);
  if (title && title !== product.title) fixes.title = title;
  if (product.image_url && !isProductImage(product.image_url)) fixes.image_url = null;
  return fixes;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const { db } = createStore();
  if (!db) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed to fix saved products.');
  const { data, error } = await db.from('products').select('id, title, image_url').eq('source', 'custom');
  if (error) throw error;
  let changed = 0;
  for (const product of data) {
    const fixes = fixesFor(product);
    if (!Object.keys(fixes).length) continue;
    changed++;
    console.log(`#${product.id}: ${JSON.stringify({ title: product.title, image_url: product.image_url })} -> ${JSON.stringify(fixes)}`);
    if (!apply) continue;
    const { error: updateError } = await db.from('products').update(fixes).eq('id', product.id);
    if (updateError) throw updateError;
  }
  console.log(`${changed} of ${data.length} products ${apply ? 'fixed' : 'would change (add --apply to save)'}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
