import { ImageResponse } from "next/og";
import { getDictionary, resolveLang } from "@/i18n/server";
import { isRtl } from "@/i18n/config";

export const alt = "Price Tracker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await resolveLang(params);
  const t = await getDictionary(lang);
  return new ImageResponse(
    <div lang={lang} style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", padding: 80, background: "#f7f6f3", color: "#1c1b18", borderBottom: "16px solid #c2410c", textAlign: isRtl(lang) ? "right" : "left" }}>
      <svg width="88" height="88" viewBox="0 0 32 32">
        <path d="M4 7.5A3.5 3.5 0 017.5 4h9.1a3.5 3.5 0 012.5 1l8.4 8.4a3.5 3.5 0 010 5l-8.6 8.6a3.5 3.5 0 01-5 0L5 18.6a3.5 3.5 0 01-1-2.5z" fill="#c2410c" />
        <circle cx="10" cy="10" r="2" fill="#f7f6f3" />
        <path d="M17 11.5v8m0 0l-3.2-3.2M17 19.5l3.2-3.2" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ display: "flex", fontSize: 64, fontWeight: 700, marginTop: 32 }}>{t.meta.title}</div>
      <div style={{ display: "flex", fontSize: 32, lineHeight: 1.4, color: "#5f5c55", marginTop: 24 }}>{t.meta.description}</div>
    </div>,
    size,
  );
}
