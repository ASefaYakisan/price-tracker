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
  }
};

export function alertText(lang) {
  return Object.hasOwn(messages, lang) ? messages[lang] : messages.en;
}
