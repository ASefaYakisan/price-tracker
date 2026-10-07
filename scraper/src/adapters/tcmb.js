// Adapter for the Central Bank of the Republic of Türkiye daily exchange rates (XML).
import * as cheerio from 'cheerio';
import { fetchText } from '../fetch.js';

export const name = 'tcmb';
const URL_TODAY = 'https://www.tcmb.gov.tr/kurlar/today.xml';
const NAMES = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  CHF: 'Swiss Franc',
  JPY: 'Japanese Yen',
  SAR: 'Saudi Riyal',
};

export async function fetchAll() {
  return parseRates(await fetchText(URL_TODAY, { accept: 'application/xml' }));
}

export function parseRates(xml, names = NAMES) {
  const $ = cheerio.load(xml, { xml: true });
  return $('Currency')
    .map((_, el) => {
      const node = $(el);
      const code = node.attr('CurrencyCode');
      const unit = Number(node.find('Unit').text()) || 1;
      const selling = Number.parseFloat(node.find('ForexSelling').text());
      if (!names[code] || !Number.isFinite(selling)) return null;
      return {
        external_id: code,
        title: `${names[code]} (${code}/TRY)`,
        url: 'https://www.tcmb.gov.tr/wps/wcm/connect/tr/tcmb+tr/main+page+site+area/bugun',
        image_url: null,
        price: +(selling / unit).toFixed(4),
        currency: 'TRY',
        in_stock: true,
        rating: null,
      };
    })
    .get();
}
