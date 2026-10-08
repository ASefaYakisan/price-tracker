import ExcelJS from "exceljs";
import { getProducts, type ProductRow } from "@/lib/data";

const COLUMNS: { key: keyof ProductRow; header: string; width: number }[] = [
  { key: "title", header: "Product", width: 48 },
  { key: "source", header: "Source", width: 18 },
  { key: "price", header: "Price", width: 12 },
  { key: "previous_price", header: "Previous price", width: 15 },
  { key: "price_change", header: "Change", width: 12 },
  { key: "currency", header: "Currency", width: 10 },
  { key: "in_stock", header: "In stock", width: 10 },
  { key: "scraped_at", header: "Scraped at", width: 22 },
  { key: "url", header: "URL", width: 60 },
];

// Neutralise leading =,+,-,@ in text so spreadsheets never run it as a formula.
function safeText(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: unknown) {
  if (value == null) return "";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "yes" : "no";
  return `"${safeText(String(value)).replace(/"/g, '""')}"`;
}

function toCsv(products: ProductRow[]) {
  const rows = [COLUMNS.map((c) => c.header).join(","), ...products.map((p) => COLUMNS.map((c) => csvCell(p[c.key])).join(","))];
  return "﻿" + rows.join("\r\n");
}

async function toXlsx(products: ProductRow[]) {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Prices", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = COLUMNS.map(({ key, header, width }) => ({ key, header, width }));
  for (const p of products) {
    sheet.addRow({
      ...p,
      title: safeText(p.title),
      in_stock: p.in_stock === false ? "No" : "Yes",
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

export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const products = await getProducts();
  const filename = `prices-${new Date().toISOString().slice(0, 10)}.${format}`;
  const body = format === "xlsx" ? await toXlsx(products) : toCsv(products);
  return new Response(body, {
    headers: {
      "content-type": format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
