import { LOCALE_CODES } from "@/i18n/config";
import type { Metadata } from "next";
import Link from "next/link";
import { resolveLang } from "@/i18n/server";

const copy = {
  "en": {
    "title": "Privacy policy",
    "note": "This text is a draft, not legal advice.",
    "sections": [
      [
        "data",
        "Data and purpose",
        "Price Tracker stores your email address for account access and price notifications, your alerts (product and target price), and the product links you track so prices can be checked again."
      ],
      [
        "services",
        "Services used",
        "Supabase stores account and tracking data. Resend delivers alert emails, including the recipient address and the relevant alert details. ScraperAPI may receive product links when the optional paid reading service is enabled. Vercel hosts the website and handles requests."
      ],
      [
        "visibility",
        "Tracked links",
        "Do not submit confidential or private links. Product pages and price history can be publicly accessible; a personal list is not a promise that the underlying product is private."
      ],
      [
        "deletion",
        "Account and data deletion",
        "You can remove individual alerts on the Alerts page or use the removal link in an alert email and confirm deletion. Removing an alert does not delete your account. To delete your account, open the Profile page and choose Delete account in the Danger zone section, then type your email address to confirm: your account, alerts and personal list are removed immediately. Shared product and price history stays. Backups, the operator contact address and retention periods have not yet been specified."
      ],
      [
        "details",
        "Details still to be confirmed",
        "The operator identity, contact address, retention periods and provider account settings have not been supplied. I do not know these details. The operator must complete and review this draft before treating it as a final privacy policy."
      ]
    ]
  },
  "tr": {
    "title": "Gizlilik politikası",
    "note": "Bu metin taslaktır, hukuki tavsiye değildir.",
    "sections": [
      [
        "data",
        "Veriler ve kullanım amacı",
        "Price Tracker, hesap erişimi ve fiyat bildirimleri için e-posta adresinizi, alarmlarınızı (ürün ve hedef fiyat) ve fiyatları yeniden kontrol edebilmek için takip ettiğiniz ürün linklerini saklar."
      ],
      [
        "services",
        "Kullanılan servisler",
        "Supabase hesap ve takip verilerini saklar. Resend, alıcı adresi ve ilgili alarm bilgileriyle alarm e-postalarını gönderir. İsteğe bağlı ücretli okuma hizmeti etkinse ürün linkleri ScraperAPI ile paylaşılabilir. Vercel siteyi barındırır ve istekleri işler."
      ],
      [
        "visibility",
        "Takip edilen linkler",
        "Gizli veya özel linkler göndermeyin. Ürün sayfaları ve fiyat geçmişi herkese açık olabilir; kişisel listeniz olması ürünün kendisinin gizli olduğunu garanti etmez."
      ],
      [
        "deletion",
        "Hesap ve veri silme",
        "Tek bir alarmı Alarmlar sayfasından veya alarm e-postasındaki kaldırma bağlantısını açıp silmeyi onaylayarak kaldırabilirsiniz. Alarmı kaldırmak hesabınızı silmez. Hesabınızı silmek için Profil sayfasındaki Tehlikeli bölge bölümünden Hesabı sil’i seçin ve e-posta adresinizi yazarak onaylayın: hesabınız, alarmlarınız ve kişisel listeniz hemen silinir. Ortak ürün ve fiyat geçmişi kalır. Yedekler, işletmeci iletişim adresi ve saklama süreleri henüz belirtilmedi."
      ],
      [
        "details",
        "Tamamlanacak bilgiler",
        "İşletmecinin kimliği, iletişim adresi, saklama süreleri ve servis hesaplarının ayarları henüz belirtilmedi. Bu bilgileri bilmiyorum. İşletmeci bu taslağı nihai gizlilik politikası olarak kullanmadan önce tamamlamalı ve inceletmelidir."
      ]
    ]
  }
};

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  const lang = await resolveLang(params);
  return { title: `${copy[lang === "tr" ? "tr" : "en"].title} · Price Tracker`, alternates: { canonical: `/${lang}/privacy`, languages: Object.fromEntries(LOCALE_CODES.map((l) => [l, `/${l}/privacy`])) } };
}

export default async function Page({ params }: PageProps<"/[lang]/privacy">) {
  const lang = await resolveLang(params);
  const textLang = lang === "tr" ? "tr" : "en";
  const t = copy[textLang];
  return (
    <main id="main-content" tabIndex={-1} lang={textLang} dir="ltr" className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
      <p className="mt-4 rounded-xl border border-line bg-card p-4 text-sm font-medium">{t.note}</p>
      {t.sections.map(([id, title, body]) => (
        <section key={id} id={id} className="mt-8 scroll-mt-24">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-7 text-muted">{body}</p>
        </section>
      ))}
      <Link href={`/${lang}/alerts`} className="mt-6 inline-flex min-h-11 items-center text-sm text-accent underline">
        {textLang === "tr" ? "Alarmları yönet" : "Manage alerts"}
      </Link>
    </main>
  );
}
