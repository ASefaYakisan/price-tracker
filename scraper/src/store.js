import { mkdir, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

// Saves to Supabase when credentials exist, otherwise to a local JSON file.
export function createStore({ url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY } = {}) {
  return url && key ? supabaseStore(createClient(url, key, { auth: { persistSession: false } })) : jsonStore();
}

function supabaseStore(db) {
  return {
    kind: 'supabase',
    db,
    async save(source, products, scrapedAt) {
      const { data: rows, error } = await db
        .from('products')
        .upsert(
          products.map(({ price, in_stock, ...p }) => ({ ...p, source, last_seen_at: scrapedAt })),
          { onConflict: 'source,external_id' },
        )
        .select('id, external_id');
      if (error) throw error;

      const idByExternal = new Map(rows.map((r) => [r.external_id, r.id]));
      const history = products.map((p) => ({
        product_id: idByExternal.get(p.external_id),
        price: p.price,
        in_stock: p.in_stock,
        scraped_at: scrapedAt,
      }));
      const { error: histError } = await db.from('price_history').insert(history);
      if (histError) throw histError;
    },
  };
}

function jsonStore(dir = 'data') {
  return {
    kind: 'json',
    async save(source, products, scrapedAt) {
      await mkdir(dir, { recursive: true });
      const file = `${dir}/${source}-${scrapedAt.replace(/[:.]/g, '-')}.json`;
      await writeFile(file, JSON.stringify({ source, scrapedAt, products }, null, 2));
      return file;
    },
  };
}
