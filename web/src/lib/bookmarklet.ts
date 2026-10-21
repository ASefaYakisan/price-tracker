// The "Track price" bookmark: on any shop page it opens /<lang>/add with that page's address,
// which puts the link in the box and adds it (see app/[lang]/add/route.ts).
export function bookmarklet(origin: string, lang: string) {
  const add = JSON.stringify(`${origin}/${lang}/add?url=`);
  return `javascript:void(window.open(${add}+encodeURIComponent(location.href)))`;
}
