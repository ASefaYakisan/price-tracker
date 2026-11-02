import type { Metadata } from "next";
import Link from "next/link";
import { resolveLang } from "@/i18n/server";

const copy = {
  "en": {
    "title": "Terms of use",
    "note": "This text is a draft, not legal advice.",
    "sections": [
      [
        "service",
        "What the service does",
        "Price Tracker records observed prices and can notify you when an alert target is reached. It does not sell the tracked products. Purchases take place with the relevant seller."
      ],
      [
        "accuracy",
        "Prices and availability",
        "Prices, currencies and availability may change between checks. Shops may block automated reads and notifications may be delayed or fail. Check the seller’s product page and final checkout price before buying; no price, stock or delivery guarantee is made here."
      ],
      [
        "use",
        "Using the service",
        "Only submit product links you are entitled to share. Do not submit private links or misuse the service to interfere with other users or third-party sites. Keep access to your account and alert management links private."
      ],
      [
        "data",
        "Your data",
        "The privacy policy explains email addresses, alerts, tracked links and deletion options. Removing an alert stops that alert; it does not close the account."
      ],
      [
        "draft",
        "Before these terms are final",
        "The operator identity and contact address have not yet been specified. I do not know the applicable operator-specific legal details. These terms need operator completion and legal review; this draft does not claim to remove any mandatory consumer rights."
      ]
    ]
  },
  "tr": {
    "title": "Kullanım şartları",
    "note": "Bu metin taslaktır, hukuki tavsiye değildir.",
    "sections": [
      [
        "service",
        "Hizmetin kapsamı",
        "Price Tracker gözlenen fiyatları kaydeder ve alarm hedefinize ulaşıldığında bildirim gönderebilir. Takip edilen ürünleri satmaz. Alışveriş ilgili satıcı üzerinden yapılır."
      ],
      [
        "accuracy",
        "Fiyat ve stok bilgileri",
        "Fiyat, para birimi ve stok durumu kontroller arasında değişebilir. Mağazalar otomatik okumayı engelleyebilir; bildirim gecikebilir veya gönderilemeyebilir. Satın almadan önce satıcının ürün sayfasını ve ödeme ekranındaki son fiyatı kontrol edin; burada fiyat, stok veya teslimat garantisi verilmez."
      ],
      [
        "use",
        "Hizmetin kullanımı",
        "Yalnızca paylaşma hakkınız olan ürün linklerini gönderin. Özel linkler göndermeyin; hizmeti diğer kullanıcıları veya üçüncü taraf siteleri engellemek için kötüye kullanmayın. Hesabınıza erişimi ve alarm yönetim bağlantılarını gizli tutun."
      ],
      [
        "data",
        "Verileriniz",
        "Gizlilik politikası e-posta adresi, alarmlar, takip edilen linkler ve silme seçeneklerini açıklar. Alarmı kaldırmak o alarmı durdurur; hesabı kapatmaz."
      ],
      [
        "draft",
        "Metin tamamlanmadan önce",
        "İşletmecinin kimliği ve iletişim adresi henüz belirtilmedi. İşletmeciye özel uygulanacak hukuki ayrıntıları bilmiyorum. Metin işletmeci tarafından tamamlanmalı ve hukuki incelemeden geçmelidir; bu taslak zorunlu tüketici haklarını kaldırdığı iddiasında değildir."
      ]
    ]
  }
};

export async function generateMetadata({ params }: PageProps<"/[lang]/terms">): Promise<Metadata> {
  const lang = await resolveLang(params);
  return { title: `${copy[lang === "tr" ? "tr" : "en"].title} · Price Tracker` };
}

export default async function Page({ params }: PageProps<"/[lang]/terms">) {
  const lang = await resolveLang(params);
  const textLang = lang === "tr" ? "tr" : "en";
  const t = copy[textLang];
  return (
    <main lang={textLang} dir="ltr" className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
      <p className="mt-4 rounded-xl border border-line bg-card p-4 text-sm font-medium">{t.note}</p>
      {t.sections.map(([id, title, body]) => (
        <section key={id} id={id} className="mt-8 scroll-mt-24">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-7 text-muted">{body}</p>
        </section>
      ))}
      <Link href={`/${lang}/privacy`} className="mt-6 inline-flex min-h-11 items-center text-sm text-accent underline">
        {textLang === "tr" ? "Gizlilik ve veri silme" : "Privacy and data deletion"}
      </Link>
    </main>
  );
}
