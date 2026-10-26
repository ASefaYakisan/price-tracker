# Güvenlik ayarları kontrol listesi (Sefa)

Kod tarafı hazır. Aşağıdaki ayarlar panelden elle yapılır. Sırayı bozma: Turnstile'da önce siteye anahtar, sonra Supabase'de captcha açılır; ters yapılırsa giriş formu çalışmaz.

Her adımın sonunda "Nasıl doğrularım" kısmını yap; bitirince en alttaki uçtan uca testi çalıştır.

## 1. Cloudflare Turnstile (bot kontrolü)

1. Cloudflare panelinde **Turnstile** → **Add widget**. Alan adı olarak canlı site adresini (`price-tracker-shop.vercel.app`) ekle, mod **Managed**.
2. İki anahtar verir: **Site Key** (herkese açık) ve **Secret Key** (gizli).
3. Vercel → proje → **Settings → Environment Variables**: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = Site Key (Production). Sonra **Redeploy**.
4. Siteyi aç, giriş sayfasında captcha kutusunun göründüğünü doğrula.
5. Supabase → **Authentication → Attack Protection** → **Enable CAPTCHA protection** → sağlayıcı **Cloudflare Turnstile**, Secret Key'i buraya yapıştır → Save.

Secret Key'i sohbete, issue'ya, koda yazma; sadece Supabase paneline gir.

Nasıl doğrularım: giriş sayfasında kutu görünür ve giriş çalışır. Kutu yokken (adım 5 yapılmışsa) giriş "captcha" hatası verir; bu, adım 3'ün atlandığı anlamına gelir.

## 2. E-posta şablonları ve kod uzunluğu

1. Supabase → **Authentication → Email Templates**.
2. **Confirm signup**: `supabase/email-templates/confirm-signup.html` içeriğini yapıştır. Konu: `Your Price Tracker code` (istediğin gibi değiştirebilirsin). Şablon 8 haneli kodu (`{{ .Token }}`) gösterir.
3. **Reset password**: `supabase/email-templates/reset-password.html` içeriğini yapıştır.
4. Kod uzunluğu: **Authentication → Sign In / Providers → Email** (veya Auth ayarları) içinde **OTP length** = **8** olmalı. Site 8 kutu gösterir; farklıysa kod girilemez.

Nasıl doğrularım: yeni bir e-postayla kayıt ol, gelen e-postada 8 haneli kod ve logo görünmeli.

## 3. Supabase Auth ayarları

**Authentication → Providers → Email:**
1. **Confirm email**: açık.
2. **Minimum password length**: 8 (altını kabul etme).
3. **Password requirements**: küçük harf, büyük harf ve rakam zorunlu (sitenin şifre alanındaki kuralla aynı).

**Authentication → Rate Limits:**
4. Sign-ups/sign-ins ve e-posta gönderimi limitlerini düşük tut (öneri: e-posta saatte 30, sign-in ve OTP için varsayılan değerler). Kendi SMTP'n (Gmail) saatte yaklaşık 30 e-posta gönderebildiği için e-posta limitini bunun üstüne çıkarma.

**Authentication → URL Configuration:**
5. **Site URL** canlı adres olsun; **Redirect URLs** listesinde sadece bu adres bulunsun (kendi alan adını alınca burayı güncelle, bkz. #59).

## 4. Uçtan uca test (canlıda)

Her adımda sonucu yaz; başarısız olanı issue #56'ya not et.

1. Yeni bir e-postayla kayıt ol → captcha çözülür → 8 haneli kod e-postaya gelir.
2. Kodu gir → hesap açılır, giriş yapılmış olur.
3. Çıkış yap, yanlış şifreyle 5 kez dene → 30 saniyelik kilit mesajı görünür.
4. Doğru şifreyle giriş yap.
5. **Şifremi unuttum** → e-postaya kod gelir → kodu gir → yeni şifre belirle → yeni şifreyle giriş yap.
6. Bir ürün linki ekle (giriş zorunlu); çıkış yapılmışken eklemenin reddedildiğini doğrula.

Hepsi geçerse #56 kapatılabilir.
