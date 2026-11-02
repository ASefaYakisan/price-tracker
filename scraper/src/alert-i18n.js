// Email copy only; prices keep their existing format and links remain unchanged.
const messages = {
  "en": {
    "subject": "Price alert: {title} is now {price}",
    "body": "{title} dropped to {price} (your target: {target}).",
    "history": "Price history",
    "source": "Source",
    "once": "You get this email once per alert. Create a new alert on the product page to track it again.",
    "target": "Set or change a target",
    "remove": "Remove this alert"
  },
  "tr": {
    "subject": "Fiyat alarmı: {title} şimdi {price}",
    "body": "{title} fiyatı {price} seviyesine düştü (hedefiniz: {target}).",
    "history": "Fiyat geçmişi",
    "source": "Kaynak",
    "once": "Bu e-postayı her alarm için bir kez alırsınız. Tekrar takip etmek için ürün sayfasından yeni bir alarm oluşturun.",
    "target": "Hedef belirle veya değiştir",
    "remove": "Bu alarmı kaldır"
  },
  "de": {
    "subject": "Preisalarm: {title} kostet jetzt {price}",
    "body": "Der Preis von {title} ist auf {price} gefallen (Ihr Zielpreis: {target}).",
    "history": "Preisverlauf",
    "source": "Quelle",
    "once": "Sie erhalten diese E-Mail einmal pro Alarm. Erstellen Sie auf der Produktseite einen neuen Alarm, um den Preis erneut zu verfolgen.",
    "target": "Zielpreis festlegen oder ändern",
    "remove": "Diesen Alarm entfernen"
  },
  "fr": {
    "subject": "Alerte de prix : {title} coûte maintenant {price}",
    "body": "Le prix de {title} est descendu à {price} (votre prix cible : {target}).",
    "history": "Historique des prix",
    "source": "Source",
    "once": "Vous recevez cet e-mail une seule fois par alerte. Créez une nouvelle alerte sur la page du produit pour suivre à nouveau son prix.",
    "target": "Définir ou modifier un prix cible",
    "remove": "Supprimer cette alerte"
  },
  "es": {
    "subject": "Alerta de precio: {title} ahora cuesta {price}",
    "body": "El precio de {title} ha bajado a {price} (tu precio objetivo: {target}).",
    "history": "Historial de precios",
    "source": "Fuente",
    "once": "Recibes este correo una vez por alerta. Crea una nueva alerta en la página del producto para volver a seguir su precio.",
    "target": "Establecer o cambiar un precio objetivo",
    "remove": "Eliminar esta alerta"
  },
  "it": {
    "subject": "Avviso di prezzo: {title} ora costa {price}",
    "body": "Il prezzo di {title} è sceso a {price} (il tuo prezzo obiettivo: {target}).",
    "history": "Storico dei prezzi",
    "source": "Fonte",
    "once": "Ricevi questa email una sola volta per avviso. Crea un nuovo avviso nella pagina del prodotto per seguirne nuovamente il prezzo.",
    "target": "Imposta o modifica un prezzo obiettivo",
    "remove": "Rimuovi questo avviso"
  },
  "pt": {
    "subject": "Alerta de preço: {title} agora custa {price}",
    "body": "O preço de {title} caiu para {price} (seu preço-alvo: {target}).",
    "history": "Histórico de preços",
    "source": "Fonte",
    "once": "Você recebe este e-mail uma vez por alerta. Crie um novo alerta na página do produto para acompanhar o preço novamente.",
    "target": "Definir ou alterar um preço-alvo",
    "remove": "Remover este alerta"
  },
  "nl": {
    "subject": "Prijsalert: {title} kost nu {price}",
    "body": "De prijs van {title} is gedaald naar {price} (uw doelprijs: {target}).",
    "history": "Prijsgeschiedenis",
    "source": "Bron",
    "once": "U ontvangt deze e-mail één keer per alert. Maak een nieuwe alert aan op de productpagina om de prijs opnieuw te volgen.",
    "target": "Een doelprijs instellen of wijzigen",
    "remove": "Deze alert verwijderen"
  },
  "ru": {
    "subject": "Уведомление о цене: {title} теперь стоит {price}",
    "body": "Цена на {title} снизилась до {price} (ваша целевая цена: {target}).",
    "history": "История цен",
    "source": "Источник",
    "once": "Это письмо отправляется один раз для каждого уведомления. Чтобы снова отслеживать цену, создайте новое уведомление на странице товара.",
    "target": "Установить или изменить целевую цену",
    "remove": "Удалить это уведомление"
  },
  "ar": {
    "subject": "تنبيه السعر: سعر {title} الآن {price}",
    "body": "انخفض سعر {title} إلى {price} (السعر المستهدف: {target}).",
    "history": "سجل الأسعار",
    "source": "المصدر",
    "once": "تتلقى هذه الرسالة مرة واحدة لكل تنبيه. أنشئ تنبيهًا جديدًا على صفحة المنتج لمتابعة السعر مرة أخرى.",
    "target": "تحديد السعر المستهدف أو تغييره",
    "remove": "إزالة هذا التنبيه"
  },
  "cs": {
    "subject": "Cenová výstraha: {title} nyní stojí {price}",
    "body": "Cena produktu {title} klesla na {price} (vaše cílová cena: {target}).",
    "history": "Historie cen",
    "source": "Zdroj",
    "once": "Tento e-mail dostanete jednou pro každou výstrahu. Chcete-li cenu sledovat znovu, vytvořte novou výstrahu na stránce produktu.",
    "target": "Nastavit nebo změnit cílovou cenu",
    "remove": "Odebrat tuto výstrahu"
  },
  "da": {
    "subject": "Prisalarm: {title} koster nu {price}",
    "body": "Prisen på {title} er faldet til {price} (din målpris: {target}).",
    "history": "Prishistorik",
    "source": "Kilde",
    "once": "Du får denne e-mail én gang pr. alarm. Opret en ny alarm på produktsiden for at følge prisen igen.",
    "target": "Angiv eller ændr en målpris",
    "remove": "Fjern denne alarm"
  },
  "el": {
    "subject": "Ειδοποίηση τιμής: το {title} κοστίζει τώρα {price}",
    "body": "Η τιμή του {title} έπεσε στα {price} (η τιμή-στόχος σας: {target}).",
    "history": "Ιστορικό τιμών",
    "source": "Πηγή",
    "once": "Λαμβάνετε αυτό το email μία φορά για κάθε ειδοποίηση. Δημιουργήστε νέα ειδοποίηση στη σελίδα του προϊόντος για να παρακολουθήσετε ξανά την τιμή.",
    "target": "Ορισμός ή αλλαγή τιμής-στόχου",
    "remove": "Κατάργηση αυτής της ειδοποίησης"
  },
  "hi": {
    "subject": "मूल्य अलर्ट: {title} अब {price} का है",
    "body": "{title} की कीमत घटकर {price} हो गई है (आपकी लक्षित कीमत: {target})।",
    "history": "मूल्य इतिहास",
    "source": "स्रोत",
    "once": "आपको यह ईमेल प्रत्येक अलर्ट के लिए एक बार मिलता है। कीमत को फिर से ट्रैक करने के लिए उत्पाद पृष्ठ पर नया अलर्ट बनाएँ।",
    "target": "लक्षित कीमत सेट करें या बदलें",
    "remove": "यह अलर्ट हटाएँ"
  },
  "id": {
    "subject": "Peringatan harga: {title} kini {price}",
    "body": "Harga {title} turun menjadi {price} (harga target Anda: {target}).",
    "history": "Riwayat harga",
    "source": "Sumber",
    "once": "Anda menerima email ini sekali untuk setiap peringatan. Buat peringatan baru di halaman produk untuk melacak harganya lagi.",
    "target": "Atur atau ubah harga target",
    "remove": "Hapus peringatan ini"
  },
  "ja": {
    "subject": "価格アラート：{title} は現在 {price} です",
    "body": "{title} の価格が {price} に下がりました（目標価格：{target}）。",
    "history": "価格履歴",
    "source": "情報元",
    "once": "このメールはアラートごとに1回だけ届きます。再度追跡するには、商品ページで新しいアラートを作成してください。",
    "target": "目標価格を設定・変更する",
    "remove": "このアラートを削除する"
  },
  "ko": {
    "subject": "가격 알림: {title}의 현재 가격은 {price}입니다",
    "body": "{title}의 가격이 {price}(으)로 내려갔습니다 (목표 가격: {target}).",
    "history": "가격 기록",
    "source": "출처",
    "once": "이 이메일은 알림마다 한 번만 발송됩니다. 다시 추적하려면 상품 페이지에서 새 알림을 만드세요.",
    "target": "목표 가격 설정 또는 변경",
    "remove": "이 알림 삭제"
  },
  "pl": {
    "subject": "Alert cenowy: {title} kosztuje teraz {price}",
    "body": "Cena produktu {title} spadła do {price} (Twoja cena docelowa: {target}).",
    "history": "Historia cen",
    "source": "Źródło",
    "once": "Ten e-mail otrzymujesz raz dla każdego alertu. Aby ponownie śledzić cenę, utwórz nowy alert na stronie produktu.",
    "target": "Ustaw lub zmień cenę docelową",
    "remove": "Usuń ten alert"
  },
  "ro": {
    "subject": "Alertă de preț: {title} costă acum {price}",
    "body": "Prețul pentru {title} a scăzut la {price} (prețul țintă: {target}).",
    "history": "Istoricul prețurilor",
    "source": "Sursă",
    "once": "Primești acest e-mail o singură dată pentru fiecare alertă. Creează o alertă nouă pe pagina produsului pentru a urmări din nou prețul.",
    "target": "Setează sau modifică un preț țintă",
    "remove": "Elimină această alertă"
  },
  "sv": {
    "subject": "Prisvarning: {title} kostar nu {price}",
    "body": "Priset på {title} har sjunkit till {price} (ditt målpris: {target}).",
    "history": "Prishistorik",
    "source": "Källa",
    "once": "Du får det här e-postmeddelandet en gång per varning. Skapa en ny varning på produktsidan för att följa priset igen.",
    "target": "Ange eller ändra ett målpris",
    "remove": "Ta bort den här varningen"
  },
  "th": {
    "subject": "แจ้งเตือนราคา: {title} ตอนนี้ราคา {price}",
    "body": "ราคาของ {title} ลดลงเป็น {price} (ราคาเป้าหมายของคุณ: {target})",
    "history": "ประวัติราคา",
    "source": "แหล่งที่มา",
    "once": "คุณจะได้รับอีเมลนี้หนึ่งครั้งต่อการแจ้งเตือนแต่ละรายการ หากต้องการติดตามราคาอีกครั้ง ให้สร้างการแจ้งเตือนใหม่ในหน้าสินค้า",
    "target": "ตั้งหรือเปลี่ยนราคาเป้าหมาย",
    "remove": "ลบการแจ้งเตือนนี้"
  },
  "uk": {
    "subject": "Сповіщення про ціну: {title} тепер коштує {price}",
    "body": "Ціна на {title} знизилася до {price} (ваша цільова ціна: {target}).",
    "history": "Історія цін",
    "source": "Джерело",
    "once": "Цей лист надходить один раз для кожного сповіщення. Щоб знову відстежувати ціну, створіть нове сповіщення на сторінці товару.",
    "target": "Встановити або змінити цільову ціну",
    "remove": "Видалити це сповіщення"
  },
  "vi": {
    "subject": "Cảnh báo giá: {title} hiện có giá {price}",
    "body": "Giá của {title} đã giảm xuống {price} (giá mục tiêu của bạn: {target}).",
    "history": "Lịch sử giá",
    "source": "Nguồn",
    "once": "Bạn chỉ nhận email này một lần cho mỗi cảnh báo. Hãy tạo cảnh báo mới trên trang sản phẩm để theo dõi giá lại.",
    "target": "Đặt hoặc thay đổi giá mục tiêu",
    "remove": "Xóa cảnh báo này"
  },
  "zh": {
    "subject": "价格提醒：{title} 现价 {price}",
    "body": "{title} 的价格已降至 {price}（您的目标价：{target}）。",
    "history": "价格历史",
    "source": "来源",
    "once": "每个提醒您只会收到一次此邮件。如需再次追踪价格，请在商品页面创建新的提醒。",
    "target": "设置或更改目标价",
    "remove": "移除此提醒"
  }
};

export function alertText(lang) {
  return Object.hasOwn(messages, lang) ? messages[lang] : messages.en;
}
