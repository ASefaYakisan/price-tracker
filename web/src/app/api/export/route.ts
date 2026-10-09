import ExcelJS from "exceljs";
import { DEFAULT_LOCALE, intlLocale, isLocale, type Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries/en";
import { getDictionary } from "@/i18n/server";
import { getProducts, type ProductRow } from "@/lib/data";
import { sourceLabel } from "@/lib/format";

const COLUMNS: { key: keyof ProductRow; header: keyof Dict["export"]; width: number }[] = [
  { key: "title", header: "product", width: 48 },
  { key: "source", header: "source", width: 18 },
  { key: "price", header: "price", width: 12 },
  { key: "previous_price", header: "previous", width: 15 },
  { key: "price_change", header: "change", width: 12 },
  { key: "currency", header: "currency", width: 10 },
  { key: "in_stock", header: "inStock", width: 10 },
  { key: "scraped_at", header: "scrapedAt", width: 22 },
  { key: "url", header: "url", width: 60 },
];

// Neutralise leading =,+,-,@ in text so spreadsheets never run it as a formula.
function safeText(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

// Spreadsheets in decimal-comma languages (Türkçe, Deutsch…) expect "1,5" and ";" between columns.
function csvFormat(lang: Locale) {
  const decimal = new Intl.NumberFormat(intlLocale(lang)).formatToParts(1.5).find((p) => p.type === "decimal")?.value ?? ".";
  return { decimal, separator: decimal === "," ? ";" : "," };
}

function toCsv(products: ProductRow[], t: Dict, lang: Locale) {
  const { decimal, separator } = csvFormat(lang);
  const cell = (value: unknown, key: keyof ProductRow) => {
    if (value == null) return "";
    if (typeof value === "number") return String(value).replace(".", decimal);
    if (typeof value === "boolean") return value ? t.export.yes : t.export.no;
    if (key === "scraped_at") return String(value).slice(0, 16).replace("T", " ");
    const text = key === "source" ? sourceLabel(String(value), t) : String(value);
    return `"${safeText(text).replace(/"/g, '""')}"`;
  };
  const rows = [
    COLUMNS.map((c) => `"${t.export[c.header]}"`).join(separator),
    ...products.map((p) => COLUMNS.map((c) => cell(c.key === "in_stock" ? p.in_stock !== false : p[c.key], c.key)).join(separator)),
  ];
  return "﻿" + rows.join("\r\n");
}

async function toXlsx(products: ProductRow[], t: Dict, lang: Locale) {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet(t.export.sheet, { views: [{ state: "frozen", ySplit: 1, rightToLeft: lang === "ar" }] });
  sheet.columns = COLUMNS.map(({ key, header, width }) => ({ key, header: t.export[header], width }));
  for (const p of products) {
    sheet.addRow({
      ...p,
      title: safeText(p.title),
      source: sourceLabel(p.source, t),
      in_stock: p.in_stock === false ? t.export.no : t.export.yes,
      scraped_at: p.scraped_at ? new Date(p.scraped_at) : null,
      url: p.url ? { text: p.url, hyperlink: p.url } : null,
    });
  }
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = { from: "A1", to: { row: 1, column: COLUMNS.length } };
  for (const key of ["price", "previous_price", "price_change"]) sheet.getColumn(key).numFmt = "#,##0.00";
  sheet.getColumn("scraped_at").numFmt = "yyyy-mm-dd hh:mm";
  return book.xlsx.writeBuffer();
}

// GET ?format=csv|xlsx&lang=tr -> the price list with headers and labels in that language.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const format = params.get("format") === "xlsx" ? "xlsx" : "csv";
  const asked = params.get("lang");
  const lang = isLocale(asked) ? asked : DEFAULT_LOCALE;
  const [products, t] = await Promise.all([getProducts(), getDictionary(lang)]);
  const filename = `${t.export.file}-${new Date().toISOString().slice(0, 10)}.${format}`;
  const body = format === "xlsx" ? await toXlsx(products, t, lang) : toCsv(products, t, lang);
  return new Response(body, {
    headers: {
      "content-type": format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv; charset=utf-8",
      // filename* carries non-ASCII names (fiyatlar, 价格); the plain one is the fallback.
      "content-disposition": `attachment; filename="prices-${filename.slice(t.export.file.length + 1)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
