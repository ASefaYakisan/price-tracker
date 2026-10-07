import { getProducts } from "@/lib/data";

const COLUMNS = ["id", "source", "title", "url", "price", "previous_price", "price_change", "currency", "in_stock", "scraped_at"] as const;

// Quote every field and neutralise leading =,+,-,@ so spreadsheets don't run it as a formula.
function cell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text) && Number.isNaN(Number(text))) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET() {
  const products = await getProducts();
  const rows = [COLUMNS.join(","), ...products.map((p) => COLUMNS.map((c) => cell(p[c])).join(","))];
  return new Response("﻿" + rows.join("\r\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="prices-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
