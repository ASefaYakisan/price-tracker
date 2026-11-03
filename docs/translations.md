# Translations

## Current languages and direction

`LOCALE_CODES` is derived from `LOCALES`, currently these 24 entries:

| Code | Name | Direction |
| --- | --- | --- |
| en | English | LTR |
| tr | Türkçe | LTR |
| de | Deutsch | LTR |
| fr | Français | LTR |
| es | Español | LTR |
| pt | Português | LTR |
| it | Italiano | LTR |
| nl | Nederlands | LTR |
| pl | Polski | LTR |
| sv | Svenska | LTR |
| da | Dansk | LTR |
| ro | Română | LTR |
| cs | Čeština | LTR |
| el | Ελληνικά | LTR |
| ru | Русский | LTR |
| uk | Українська | LTR |
| ar | العربية | RTL |
| hi | हिन्दी | LTR |
| zh | 简体中文 | LTR |
| ja | 日本語 | LTR |
| ko | 한국어 | LTR |
| id | Bahasa Indonesia | LTR |
| vi | Tiếng Việt | LTR |
| th | ไทย | LTR |

Only Arabic currently has `rtl: true`; the language layout sets `<html lang>`
and `dir` from this configuration. The `intl` values determine number/date
formatting and are not always the same as the URL code (for example pt-BR).
Bare page URLs use the saved language cookie, browser preference, then English.

Sources: `web/src/i18n/config.ts`, `web/src/app/[lang]/layout.tsx`, `web/src/proxy.ts`.

## Adding an interface message

1. Add a string key to `web/src/i18n/dictionaries/en.ts` and the same nested
   key in every other dictionary. `Dict` is derived from English using `Widen`,
   retaining the key structure while allowing translated string values.
2. Keep placeholder names exactly, including braces: `{name}` stays `{name}`,
   even if its position changes. `fill()` replaces word-name placeholders;
   unresolved names remain visible. Do not translate placeholder identifiers.
3. Server components load a dictionary with `getDictionary`; client components
   use `useI18n()` through `I18nProvider`. The latter also supplies `fill`,
   language-prefixed `href` and translated API-error lookup with English fallback.
4. Run tests and lint. Key tests catch missing/extra keys; placeholder tests
   compare sets against English, independent of order or repetition.

From `web/`:

```sh
npm ci
npm test
npx eslint src test
```

Sources: `web/src/i18n/dictionaries/en.ts`, `web/src/i18n/config.ts`,
`web/src/i18n/server.ts`, `web/src/i18n/client.tsx`,
`web/test/i18n-keys.test.mts`, `web/test/i18n-placeholders.test.mts`.

## Adding a language

Add its code, native name, `intl` locale and optional `rtl: true` to `LOCALES`.
Create `<code>.ts` in the dictionary directory using the complete English
structure and the `Dict` type, then translate the values. Add its dynamic
import to the typed `loaders` map in `server.ts`.

Update the explicit 24-file expectation in `i18n-keys.test.mts` for the new
count. Placeholder tests and static language parameters already iterate
`LOCALE_CODES`; they do not need a second hardcoded language list.
Add the language's full alert-copy block in `scraper/src/alert-i18n.js` too:
the scraper's tests discover web dictionary files and reject an English fallback
object in place of a supported language's dictionary. Preserve all alert keys
and their placeholder sets. Run both projects' tests.

The layout derives direction from configuration. Inspect the new language's
layout and font fallback in a browser; adding keys does not verify RTL layout
or translated text quality. Existing legal pages need separate translated copy
and language selection logic if they are to display the new language.

Sources: `web/src/i18n/config.ts`, `web/src/i18n/server.ts`,
`web/src/i18n/dictionaries/tr.ts`, `web/test/i18n-keys.test.mts`,
`web/test/i18n-placeholders.test.mts`, `web/src/app/[lang]/layout.tsx`,
`scraper/test/alert-i18n.test.js`, `web/src/app/[lang]/privacy/page.tsx`,
`web/src/app/[lang]/terms/page.tsx`.

## Email, Telegram and legal copy are separate

Price-alert emails use `scraper/src/alert-i18n.js`, not the web dictionaries.
`alertText()` falls back to English for unknown language codes. Above-target
body copy also falls back when missing, and unreadable-link emails merge
English defaults with the selected dictionary. These runtime fallbacks do not
replace the complete-key requirement enforced by tests for supported languages.

At source revision `2863e62`, regular price-alert copy covers all 24 languages.
The 13 `dead...` unreadable-link keys are translated in English/Turkish, with
English copies in the other 22 blocks; `alerts.footerRule` has the same
English/Turkish versus 22-language split. Translation issues #209 and #210
address those remaining copies. Check their merged state when updating this guide.

Telegram is **not English-only**: `TELEGRAM_LANG` selects en/tr/de/fr/es digest
copy in `scraper/src/notify.js`, with English fallback for other languages.
The supplied Supabase signup-confirmation and password-reset HTML templates
contain static English wording and do not read the web dictionaries. Operators
install those templates separately; translated interface strings do not change them.

The privacy and terms pages contain Turkish and English drafts. Languages other
than Turkish currently display the English copy. Their operator/contact/retention
details still require completion as described in the handover guide.

From `scraper/`, validate alert keys and rendered placeholders:

```sh
npm ci
npm test
```

Sources: `scraper/src/alert-i18n.js`, `scraper/src/alerts.js`,
`scraper/test/alert-i18n.test.js`, `scraper/src/notify.js`,
`supabase/email-templates/confirm-signup.html`,
`supabase/email-templates/reset-password.html`, `docs/SETUP.md`,
`docs/devir-rehberi.md`, `web/src/app/[lang]/privacy/page.tsx`,
`web/src/app/[lang]/terms/page.tsx`.

## Review status

Translations have not been reviewed by native speakers. Passing structural
tests verifies keys and placeholders, not meaning, tone or natural phrasing.
Record any deliberately retained English copy for the reviewer.

Sources: review status supplied in issue #206; structural checks in
`web/test/i18n-keys.test.mts`, `web/test/i18n-placeholders.test.mts`,
`scraper/test/alert-i18n.test.js`.
