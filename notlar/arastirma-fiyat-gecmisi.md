# Araştırma: ürün eklenince fiyat geçmişi gösterme (issue #51)

Durum: araştırma raporu, kod yok. Tarih: 26 Ekim 2026.
Not: Bu konteynerden mağaza ve servis sitelerine doğrudan erişim yok. Aşağıdaki hukuki/teknik notlar genel bilgi ve arama sonuçlarına dayanır; **uygulamadan önce her kaynağın güncel şartları ilgili sitede ve gerekirse bir hukukçuyla doğrulanmalı.** Bu rapor hukuki tavsiye değildir.

## Özet öneri

1. **Geçmiş uydurulmayacak.** Fiyat geçmişi yoksa arayüz "Takip bugün başladı" göstermeli.
2. **Kısa vadede (güvenli, ücretsiz):** yeni ürünün grafiğinde "geçmiş oluşuyor" ilerleme göstergesi (ör. "Gün 1 / 7"). Veri yalnızca bizim okumalarımızdan gelir.
3. **Orta vadede:** sadece **Amazon** ürünleri için Keepa API (ücretli, resmî, kullanım hakkı açık) ile geriye dönük veri; `price_history.source = 'backfill'` olarak etiketlenir.
4. **Yapılmayacaklar:** Akakçe/Cimri gibi karşılaştırma sitelerinin geçmiş grafiğini kazımak; Wayback Machine'den fiyat çıkarmak (güvenilmez, düzensiz).

## Kaynak karşılaştırması

| Kaynak | Ne verir | Yasallık / şartlar | Sınır ve maliyet | Güvenilirlik | Öneri |
|---|---|---|---|---|---|
| Mağaza sayfasındaki gömülü grafik verisi (ör. Trendyol/HB "fiyat geçmişi" JSON'u, varsa) | Mağazanın kendi geçmişi | Sayfayı okumak zaten yaptığımız şey ama mağaza ToS'ları otomatik erişimi çoğunlukla yasaklar; veri tabanı hakları (AB 96/9/EC, Türkiye FSEK) toplu çıkarmayı kısıtlayabilir | Ek istek yok (aynı sayfa) | Çok mağazada böyle veri yok; olanlar da tek mağazaya özel | Sadece zaten okunan sayfada **açıkça bulunan** veri için, mağaza başına ayrı değerlendirme. Genel çözüm değil |
| Akakçe / Cimri vb. karşılaştırma siteleri | Çok mağazalı geçmiş grafiği | Kendi derledikleri veri tabanı; ToS ve robots.txt otomatik çekmeyi genelde yasaklar; veri tabanı hakkı riski yüksek | Engellenme, IP yasağı | Yüksek ama hak riski var | **Yapma** |
| [Keepa](https://keepaapi.readthedocs.io/en/stable/product_query.html) (Amazon) | Amazon ürünleri için yıllık fiyat geçmişi (resmî API, kütüphaneleri var) | Ticari API; kullanım hakkı abonelikle gelir. Verinin yeniden dağıtımı için Keepa şartları ayrıca okunmalı | Jeton (token) tabanlı abonelik, aylık ücretli ([fiyat özeti](https://revenuegeeks.com/keepa-pricing/)); hız jetonla sınırlı | İyi, yalnızca Amazon | Amazon için **tek uygun aday**; maliyeti satış sonrası alıcı karşılar |
| [Wayback Machine](https://cirosantilli.com/wayback-machine-rate-limit) (Internet Archive) | Eski sayfa kopyaları | Arşiv API'leri açık, ama sayfaların içeriği mağazaya aittir; hız sınırı var | Düşük hız limiti | Çok düşük: kopyalar düzensiz, çoğu üründe yok, fiyat JS ile gelir | **Yapma** |
| Kullanıcıdan alınan veri | Kullanıcının elle girdiği eski fiyat | Sorun yok | Kullanıcı emeği | Doğrulanamaz | İsteğe bağlı, `source = 'user'` etiketli, grafikte ayrı gösterilir |
| Kendi gözlemimiz (şu an) | Yalnızca ekleme anından sonrası | Sorun yok | Ücretsiz | Yüksek | Ana yol |

## Veri modeli önerisi

- `price_history` tablosuna `source text not null default 'observed'` (`observed` | `backfill` | `user`). Migration ayrı issue'da, `sefa-gerekli`.
- Fiyat okuma ve alarm mantığı yalnızca `observed` satırlarını baz almalı; `backfill` yalnızca grafikte gösterilir (yanlış alarm riski).
- `backfill` satırları aralık başına tek örnek (günlük) saklanır; kaynak adı ve çekilme zamanı kayıtlıdır.

## Arayüz önerisi

- Grafik altında küçük etiket: "Geçmiş: Keepa (Amazon)" veya "Takip bugün başladı".
- `backfill` noktaları farklı çizgi stili (kesikli); lejant ile açıklanır.
- Yeni üründe 7 günden azsa "Geçmiş oluşuyor: gün N / 7" ilerleme çubuğu (24 dilde çeviri gerekir).

## Hukuki ve teknik riskler (kısa)

- **ToS / robots.txt:** çoğu mağaza ve karşılaştırma sitesi otomatik toplamayı yasaklar. Mevcut okuma zaten tek ürün sayfası ve kullanıcı isteğiyle sınırlı; toplu geçmiş çekimi bundan farklı ve riskli.
- **Veri tabanı hakları:** karşılaştırma sitelerinin derlemesi korunabilir (AB veri tabanı direktifi; Türkiye'de FSEK).
- **KVKK/GDPR:** fiyat verisi kişisel veri değildir; ancak geçmiş ile kullanıcı eşleştirilmez, mevcut RLS yapısı korunur.
- **Güvenilirlik:** üçüncü taraf geçmişi yanlış olabilir; kaynak etiketi bu yüzden zorunlu.

## Uygulama issue taslakları (ayrı issue olarak açılacak)

1. **"Yeni ürün grafiğinde 'Takip bugün başladı' + 7 gün ilerleme göstergesi"** — yalnızca web/UI, 24 dil, migration yok. Önerilen ilk adım.
2. **"price_history.source alanı ve grafikte kaynak etiketi"** — migration 00xx (`sefa-gerekli`), alarmlar yalnızca `observed` kullanır.
3. **"Amazon için Keepa ile geçmiş doldurma (isteğe bağlı, KEEPA_API_KEY ile)"** — anahtar yoksa özellik kapalı; anahtar Sefa/alıcı tarafından GitHub secret olarak eklenir; Keepa şartlarının yeniden dağıtım maddesi önce okunur.
