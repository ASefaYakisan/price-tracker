// Adapter for https://books.toscrape.com, a public sandbox site built for scraping practice.
import * as cheerio from 'cheerio';

export const name = 'books-toscrape';
export const startUrl = 'https://books.toscrape.com/catalogue/page-1.html';

const RATINGS = { One: 1, Two: 2, Three: 3, Four: 4, Five: 5 };

export function parseListing(html, pageUrl) {
  const $ = cheerio.load(html);
  const products = $('article.product_pod')
    .map((_, el) => {
      const card = $(el);
      const link = card.find('h3 a');
      const url = new URL(link.attr('href'), pageUrl).href;
      const priceText = card.find('.price_color').text().trim();
      const ratingClass = (card.find('.star-rating').attr('class') || '').split(' ').pop();
      return {
        external_id: url.split('/').slice(-2, -1)[0],
        title: link.attr('title')?.trim() || link.text().trim(),
        url,
        image_url: new URL(card.find('img').attr('src'), pageUrl).href,
        price: parsePrice(priceText),
        currency: priceText.includes('£') ? 'GBP' : null,
        in_stock: /in stock/i.test(card.find('.availability').text()),
        rating: RATINGS[ratingClass] ?? null,
      };
    })
    .get();

  const nextHref = $('li.next a').attr('href');
  return { products, nextUrl: nextHref ? new URL(nextHref, pageUrl).href : null };
}

export function parsePrice(text) {
  const n = Number.parseFloat(text.replace(/[^0-9.,]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
