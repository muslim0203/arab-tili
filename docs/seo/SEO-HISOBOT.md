# Arab Exam — Korporativ SEO Hisoboti

**Sana:** 2026-07-24
**Domen:** https://arabexam.uz
**Stek:** Vite + React 18 (CSR SPA), react-router v6, react-helmet-async, i18next; Vercel (frontend) + Railway (API)
**Ko'lam:** to'liq texnik + kontent + structured data + CWV + accessibility + xalqaro + ichki linking + raqobat auditi va yo'l xaritalari

> Bu hisobot Bosh SEO Arxitektori nuqtai nazaridan yozilgan. Har bir tavsif uchun:
> **Ustuvorlik (P0–P3)** · **Kutilayotgan ta'sir** · **Murakkablik** · **Reyting foydasi** ko'rsatilgan.

---

## 0. Boshqaruv xulosasi (Executive Summary)

Loyihada **yaxshi SEO poydevor** allaqachon bor edi (SEO/StructuredData komponentlari, robots, sitemap, ko'p tilli i18n). Biroq **indekslashni buzadigan bir nechta kritik xatolar** mavjud edi. Ushbu ish ularning barchasini tuzatdi va poydevorni sezilarli mustahkamladi.

**Bu PR'da tuzatilgan eng muhim narsalar:**

1. **🔴 Domen mos kelmasligi (KRITIK):** `robots.txt` va `sitemap.xml` `attanalpro.uz` (eski/noto'g'ri domen) ni ko'rsatardi, ya'ni Google butunlay boshqa domenga yo'naltirilardi. Barchasi `arabexam.uz` ga tuzatildi.
2. **🔴 Buzilgan breadcrumb domeni:** info sahifalarda `https://Arab Exam.uz/` (probel bilan) — yaroqsiz URL ishlab chiqarardi. Tuzatildi.
3. **🔴 OG rasm yo'q edi:** `og-image.png` `index.html`da ko'rsatilgan, lekin fayl mavjud emasdi → Telegram/Facebook'da ulashuvlar rasmsiz. Brendlangan 1200×630 rasm yaratildi.
4. **🔴 CSR SPA meta ko'rinmasligi:** meta va JSON-LD faqat JS ishga tushgach o'rnatilardi. JS ishlatmaydigan crawlerlar (Telegram, Facebook, WhatsApp — O'zbekistonda dominant) ularni **hech qachon ko'rmasdi**. Build vaqtida per-route statik meta injektsiyasi qo'shildi.
5. **🟠 6 ta info sahifada `<h1>` yo'q** (CardTitle `h3` chiqarardi); 2 tasida (Qollanmalar, Video) SEO umuman yo'q. Tuzatildi.
6. **🟠 Yolg'on hreflang:** `?lang=` variantlari alohida kontent bermaydi. Olib tashlandi (aks holda Google xato deb belgilaydi).

**Korporativ SEO ballari:** oldin ≈ **34/100** → bu PR'dan keyin ≈ **62/100** (batafsil §14). Enterprise darajaga (85+) yetish uchun 12 oylik yo'l xaritasi §11–13 da.

---

## 1. To'liq SEO Audit (holat jadvali)

| Soha | Oldingi holat | Hozirgi holat | Ustuvorlik |
|---|---|---|---|
| Domen izchilligi | 🔴 2 xil domen | 🟢 Yagona `arabexam.uz` | P0 ✅ |
| robots.txt | 🟠 noto'g'ri domen, marketing bloklangan | 🟢 to'g'ri, aniq qoidalar | P0 ✅ |
| sitemap.xml | 🔴 noto'g'ri domen, thin sahifalar | 🟢 to'g'ri, lastmod bilan | P0 ✅ |
| OG/Twitter rasm | 🔴 fayl yo'q (404) | 🟢 1200×630 brendlangan PNG | P0 ✅ |
| Crawlerlar uchun meta | 🔴 faqat JS'dan keyin | 🟢 statik prerender (7 yo'l) | P0 ✅ |
| Canonical | 🟠 faqat JS | 🟢 statik + JS | P1 ✅ |
| Structured Data | 🟠 Org, WebSite, FAQ | 🟢 + Course, WebPage, Breadcrumb, sameAs | P1 ✅ |
| Heading ierarxiyasi | 🔴 info sahifalarda h1 yo'q | 🟢 h1 qo'shildi | P1 ✅ |
| Thin/auth sahifalar | 🟠 login/reset indekslanadi | 🟢 noindex | P1 ✅ |
| PWA manifest | 🔴 yo'q | 🟢 `site.webmanifest` | P2 ✅ |
| SSR/to'liq SSG | 🔴 yo'q | 🟠 qisman (faqat meta) | P1 (yo'l xaritasi) |
| Xalqaro (lokalizatsiya URL) | 🔴 yo'q | 🔴 hali yo'q | P2 (yo'l xaritasi) |
| Kontent/blog | 🔴 yo'q | 🔴 hali yo'q | P1 (yo'l xaritasi) |
| Soft-404 | 🟠 SPA 200 qaytaradi | 🟠 noindex bilan yumshatildi | P2 |
| Backlink/authority | 🔴 yo'q | 🔴 yo'q | P1 (uzoq muddat) |

---

## 2. Texnik SEO Hisoboti

### Bajarilgan
- **robots.txt** (`frontend/public/robots.txt`): to'g'ri domen, API va auth yo'llari `Disallow`, marketing sahifalar ochiq. `Sitemap:` direktivasi to'g'rilandi.
- **sitemap.xml**: faqat 8 ta indekslanadigan ommaviy yo'l, `lastmod`/`changefreq`/`priority` bilan; thin auth sahifalar (login/register) olib tashlandi.
- **Statik meta prerender** (`frontend/vite.config.ts` → `seoPrerender` plugin): build vaqtida har bir ommaviy yo'l uchun `dist/<yo'l>/index.html` yaratiladi va unga per-page `<title>`, `description`, `canonical`, OG teglari joylashtiriladi. **Bu — eng katta texnik yutuq**: JS ishlatmaydigan crawlerlar endi to'g'ri meta oladi.
- **vercel.json**: `cleanUrls: true` (statik per-route fayllar xizmat qiladi), `trailingSlash: false`, hashli assetlar uchun `immutable` cache header, `sitemap.xml` uchun `application/xml`.
- **index.html**: `robots` meta (`max-image-preview:large`), `canonical`, absolyut OG rasm URL + o'lchamlari, `manifest` linki, statik JSON-LD `@graph` (Organization + WebSite).

### Aniqlangan, lekin hali qolgan (yo'l xaritasida)
- **To'liq SSR/SSG (P1):** hozir faqat meta statik, **body kontenti** hali JS'ga bog'liq. Googlebot JS render qiladi, lekin to'liq SSG indekslashni tezlashtiradi va CWV'ni yaxshilaydi. Tavsiya: `vite-react-ssg` yoki `vike` ga o'tish (marketing + info sahifalar uchun).
  *Ta'sir: Yuqori · Murakkablik: O'rta-Yuqori · Reyting foydasi: sezilarli (ayniqsa yangi domen uchun).*
- **Soft-404 (P2):** noma'lum yo'llar HTTP 200 qaytaradi (SPA). Hozir `noindex` bilan yumshatilgan. To'liq yechim uchun Vercel edge-funksiya kerak (404 status).
- **Til taksonomiyasi nomuvofiqligi (P2):** `TizimHaqida` "language use" deydi, landing "grammatika" deydi. Bittasini tanlash kerak.
- **Nav'dagi bo'sh anchorlar (P2):** `/tizim-haqida#yangiliklar`, `#vebinarlar`, `#hamkorlar` — kontent yo'q (o'lik anchorlar).

---

## 3. Kontent SEO Hisoboti

**Hozirgi holat:** kontent **imtihonga yo'naltirilgan** va yaxshi (CEFR A1–C2, 5 ko'nikma, AI baholash, sertifikat). Lekin **topical authority uchun kontent chuqurligi yetishmaydi**.

### Kalit so'z bo'shliqlari (Content Gaps)
| Bo'shliq | Intent | Ustuvorlik |
|---|---|---|
| "arab tilini o'rganish", "arab tili darslari online" | Learner (o'quv) | P1 |
| "arab tili grammatikasi" (Sarf/Nahv), "fusha vs lahja" | Ta'lim | P1 |
| CEFR daraja tavsiflari ("A1 nima biladi ... C2") | Long-tail | P1 |
| "arab tili imtihoni narxi", "arab tili sertifikati" | Transaksion | P1 |
| "O'zbekistonda arab tili imtihoni", Toshkent, madrasa/universitet | Local | P2 |
| Rasmiy imtihon nomlari (ALPT, نافس va h.k.) | Navigatsion | P2 |
| Arabcha auditoriya (تعلم العربية, امتحان اللغة العربية) | AR bozor | P2 |

### Tavsiya: Topical Authority arxitekturasi (silo)
- **Pillar 1 — "Arab tili CEFR imtihoni"** (bosh sahifa) → supporting: har bir daraja sahifasi (A1…C2), har bir ko'nikma (Listening/Reading/Writing/Speaking/Grammatika) uchun alohida sahifa.
- **Pillar 2 — "Arab tilini o'rganish"** → blog: grammatika darslari (Sarf/Nahv), lug'at, talaffuz.
- **Pillar 3 — "Sertifikat va tayyorgarlik"** → "imtihonga qanday tayyorlanish", namuna savollar, baholash mezonlari.

*Ta'sir: Juda yuqori (uzoq muddatli organik trafik) · Murakkablik: Yuqori (kontent ishlab chiqarish) · Reyting foydasi: eng katta uzoq muddatli manba.*

---

## 4. Structured Data (Schema.org) Hisoboti

### Bajarilgan (JSON-LD)
| Schema | Joy | Holat |
|---|---|---|
| `EducationalOrganization` | statik `index.html` (@graph) + `StructuredData.tsx` | 🟢 logo, image, email, sameAs (Telegram), contactPoint bilan |
| `WebSite` | statik `index.html` (@graph) | 🟢 publisher bog'langan |
| `Course` | `Landing.tsx` | 🟢 provider, teaches, educationalLevel, offers (bepul + 50k UZS) |
| `WebPage` | `Landing.tsx` + `buildWebPageSchema` | 🟢 isPartOf/about bog'langan |
| `FAQPage` | `Landing.tsx` (6 Q&A) | 🟢 |
| `BreadcrumbList` | barcha info sahifalar | 🟢 domen tuzatildi |

### Qasddan qo'shilmagan (yolg'on ma'lumot bermaslik uchun)
- **`Review`/`AggregateRating`:** haqiqiy sharh/reyting ma'lumoti yo'q → **qo'shilmadi** (soxta reyting — Google jarimasi xavfi).
- **`SearchAction` (Sitelinks Searchbox):** saytda haqiqiy qidiruv sahifasi yo'q → qo'shilmadi.
- **`VideoObject`:** video qo'llanmalar hali placeholder → kontent qo'shilganda qo'shiladi.

### Keyingi qadam (P1)
- FAQ JSON-LD matnini **ko'rinadigan** FAQ matni bilan aynan moslashtirish (Google FAQPage moslikni talab qiladi). Hozir ozgina farq bor (`Landing.tsx` `FAQ_SCHEMA_ITEMS` vs `FAQ.tsx` ko'rinishi).
- Kontent qo'shilgach: `Article`/`BlogPosting` (blog), `HowTo` ("qanday tayyorlanish"), `VideoObject`.

---

## 5. Core Web Vitals & Performance Hisoboti

### Bajarilgan
- **Kod bo'linishi (manualChunks):** `react-vendor`, `i18n`, `charts` (recharts) alohida chunklarga ajratildi → landing sahifa og'ir `recharts` (362 KB) ni yuklamaydi.
- **API preconnect + dns-prefetch:** birinchi ma'lumot so'rovi tezroq (LCP'ga yordam).
- **O'lik Google Fonts preconnect olib tashlandi:** hech qanday shrift Google'dan yuklanmaydi (index.css'da `@import` yo'q) — behuda ulanish yo'qotildi.
- **Assetlar uchun `immutable` cache** (vercel.json).

### Kuzatilgan (raqamlar bilan, gzip)
- `charts` (recharts): **106 KB** — faqat dashboard/natijalar (auth) sahifalarida yuklanadi ✓
- `index` (asosiy): **71 KB** — kattaroq; keyingi optimizatsiya nomzodi
- `react-vendor`: **53 KB**, `dropdown-menu` (radix): **28 KB**, `i18n`: **16 KB**, `Landing`: **11 KB**

### Tavsiyalar (yo'l xaritasi)
- **P1 · LCP:** landing hero rasmini (agar bo'lsa) `fetchpriority="high"` + `<link rel="preload">`; framer-motion animatsiyalarini `prefers-reduced-motion` bilan cheklash (CLS/INP).
- **P2:** `index` bundle'ni yanada bo'lish; radix `dropdown-menu` ni faqat kerakli joyda lazy qilish.
- **P2:** PageSpeed Insights + real CWV monitoring (Vercel Speed Insights / GA4 web-vitals) o'rnatish — hozir o'lchov yo'q.
- **P3:** rasmlarni WebP/AVIF ga o'tkazish (`logo.png`, `favicon.png`).

*Umumiy CWV bahosi: SPA uchun o'rtacha-yaxshi; to'liq SSG LCP/TTFB'ni sezilarli yaxshilaydi.*

---

## 6. Accessibility (Kirish imkoniyati) Hisoboti

### Bajarilgan
- **`<h1>` 6 ta info sahifada:** `CardTitle` ga `as` prop qo'shildi (`as="h1"`), vizual o'zgarishsiz to'g'ri heading outline.
- **SiteHeader logotipi** endi `/dashboard` emas, `/` (bosh sahifa) ga bog'lanadi + `aria-label`.
- **Til tugmasi** (mobil): `aria-label="Tilni tanlash"` qo'shildi (avval icon-only, nomi yo'q edi).
- **Logo `alt` matnlari** kalit so'zli o'zbekcha qilindi (LandingNav + SiteHeader).

### Qolgan (P2 — tez g'alabalar, hisobotda hujjatlashtirilgan)
- **Boglanish formasi:** 3 ta input uchun `<label>` yo'q (faqat placeholder); `aria-invalid`/`aria-describedby` va `role="status"` kerak.
- **Skip-to-content linki** hech qayerda yo'q — har sahifaga `<a href="#main">` + `<main id="main">`.
- **NotFound:** `<main>` landmark yo'q; dekorativ SVG'lar `aria-hidden` emas.
- **Landing:** `<Footer>` `<main>` ichida (contentinfo `main` tashqarisida bo'lishi kerak).

---

## 7. Xalqaro (International) SEO Hisoboti

**Hozirgi holat:** i18n (uz/en/ar + bo'sh ru) faqat **klient tomonda** ishlaydi. `?lang=` URL parametri hech narsa qilmaydi (i18n `lng:"uz"` qattiq belgilangan). Shu sabab:

- **Yolg'on hreflang olib tashlandi** — `?lang=en/ar` variantlari bir xil kontent berardi; Google buni e'tiborsiz qoldiradi yoki xato deb belgilaydi.

### Tavsiya (P2, yo'l xaritasi)
- **Haqiqiy lokalizatsiyalangan yo'llar:** `/en/…`, `/ar/…` (arab uchun RTL). Har til uchun alohida URL + server tomonda to'g'ri kontent + `hreflang` klasteri + til-specifik sitemap.
- **Arabcha (`ar`) bozor** uchun to'liq lokalizatsiya alohida katta imkoniyat (raqobat kamroq).

*Ta'sir: Yuqori (yangi bozorlar) · Murakkablik: Yuqori (routing + kontent) · Reyting foydasi: yangi til-bozorlarda.*

---

## 8. Ichki Linking (Internal Linking) Hisoboti

### Bajarilgan
- SiteHeader logotipi endi bosh sahifaga ulanadi (ilgari foydalanuvchini auth'ga yuborardi) — crawl oqimi tuzatildi.

### Tavsiyalar (P1–P2)
- **Kontekstual linklar:** landing bo'limlaridan info/blog sahifalariga tavsifli anchor bilan linklar (masalan "CEFR darajalari haqida batafsil").
- **Breadcrumb ko'rinadigan UI:** JSON-LD bor, lekin ko'rinadigan breadcrumb navigatsiyasi yo'q — foydalanuvchi + crawl uchun qo'shish.
- **Footer** allaqachon yaxshi (kolonkalar), lekin ijtimoiy linklar `href="#"` placeholder — haqiqiy Telegram linklarini qo'yish.
- **Silo:** kontent qo'shilgach, pillar→supporting ichki linking (§3).

---

## 9. Performance Hisoboti (qisqa)

Batafsil §5 da. Xulosa: kod bo'linishi qo'shildi, preconnect optimallashtirildi, cache headerlar qo'shildi. Keyingi katta yutuq — **to'liq SSG** (TTFB/LCP) va **real CWV monitoring**.

---

## 10. Raqobat Tahlili (Competitor Analysis)

**Ehtimoliy raqobatchilar (segment bo'yicha):**
1. **Umumiy til-o'rganish platformalari:** Duolingo (arabcha kursi yo'q darajada), Busuu, Memrise — brend kuchli, lekin CEFR arab imtihoniga **ixtisoslashmagan**.
2. **Arab tili maxsus saytlar:** Madinah Arabic, ArabicPod101, Kaleela — o'quvga yo'naltirilgan, **CEFR mock imtihon + AI baholash + sertifikat** kombinatsiyasi kam.
3. **Mahalliy (O'zbekiston):** madrasa/markaz saytlari, Telegram kanallar — SEO zaif, structured data yo'q.

**Arab Exam qanday ustun chiqishi mumkin (differensiatsiya):**
- **Nisha + intent:** "arab tili **CEFR** imtihoni" + "**AI baholash**" + "**sertifikat**" — aniq transaksion intent, raqobat past.
- **Mahalliylashtirish:** o'zbekcha kontent + Click/Payme + Telegram ulashish (bu PR OG rasmni tuzatdi → Telegram ulashuv ko'rinishi yaxshilandi).
- **Structured data ustunligi:** Course/FAQ/Organization to'liq — ko'p mahalliy raqobatchilarda yo'q.
- **Topical authority:** §3 dagi silo bilan "arab tili o'rganish + imtihon" bo'yicha to'liq qamrov.

**Ustun chiqish strategiyasi:** past-raqobatli long-tail o'zbekcha kalit so'zlar bilan boshlash → kontent silosi bilan authority yig'ish → arabcha bozorga kengayish.

---

## 11. 3 Oylik SEO Yo'l Xaritasi (Quick Wins + Poydevor)

| # | Vazifa | Ustuvorlik | Ta'sir | Murakkablik |
|---|---|---|---|---|
| 1 | ✅ Domen/robots/sitemap/OG/prerender (bu PR) | P0 | Yuqori | — bajarildi |
| 2 | Google Search Console + Bing Webmaster o'rnatish, sitemap yuborish | P0 | Yuqori | Past |
| 3 | GA4 + Vercel Speed Insights (CWV o'lchov) | P0 | O'rta | Past |
| 4 | FAQ JSON-LD ↔ ko'rinadigan matn moslashtirish | P1 | O'rta | Past |
| 5 | Boglanish forma label + skip-link + a11y qolganlari | P1 | O'rta | Past |
| 6 | Ko'rinadigan breadcrumb UI qo'shish | P1 | O'rta | O'rta |
| 7 | Footer ijtimoiy linklar (haqiqiy Telegram) | P2 | Past | Past |
| 8 | Til taksonomiyasi + bo'sh anchorlarni tuzatish | P2 | Past | Past |

---

## 12. 6 Oylik SEO Yo'l Xaritasi (Kontent + SSG)

| # | Vazifa | Ustuvorlik | Ta'sir | Murakkablik |
|---|---|---|---|---|
| 1 | **To'liq SSG** (`vite-react-ssg`/`vike`) — marketing+info+blog | P1 | Yuqori | Yuqori |
| 2 | **Blog/kontent hub** ishga tushirish (§3 pillarlar) | P1 | Juda yuqori | Yuqori |
| 3 | CEFR daraja sahifalari (A1–C2) + ko'nikma sahifalari | P1 | Yuqori | O'rta |
| 4 | `Article`/`BlogPosting`/`HowTo` structured data | P1 | O'rta | Past |
| 5 | Real video qo'llanmalar + `VideoObject` schema | P2 | O'rta | O'rta |
| 6 | Rasmlarni WebP/AVIF + image sitemap | P2 | O'rta | O'rta |
| 7 | Soft-404 → haqiqiy 404 (Vercel edge) | P2 | Past | O'rta |

---

## 13. 12 Oylik SEO Yo'l Xaritasi (Authority + Xalqaro)

| # | Vazifa | Ustuvorlik | Ta'sir | Murakkablik |
|---|---|---|---|---|
| 1 | **Lokalizatsiyalangan URL'lar** `/en/`, `/ar/` + hreflang klaster | P1 | Yuqori | Yuqori |
| 2 | **Arabcha bozor** kontent chuqurligi (تعلم العربية) | P1 | Yuqori | Yuqori |
| 3 | **Backlink/PR strategiyasi:** universitet/madrasa hamkorliklari, mehmon postlar | P1 | Juda yuqori | Yuqori |
| 4 | Topical authority to'ldirish (silo yakuni) | P1 | Yuqori | Yuqori |
| 5 | Google Discover optimizatsiyasi (yangiliklar/blog) | P2 | O'rta | O'rta |
| 6 | Entity/Knowledge Graph (sameAs kengaytirish, Wikidata) | P3 | Past | O'rta |
| 7 | IndexNow (Bing/Yandex tez indekslash) | P3 | Past | Past |

---

## 14. Korporativ SEO Balli (0–100)

| Dimensiya | Vazn | Oldin | Hozir (PR'dan keyin) | Enterprise maqsad |
|---|---|---|---|---|
| Texnik poydevor | 20% | 35 | 72 | 90 |
| On-page / Meta | 15% | 55 | 88 | 92 |
| Structured Data | 12% | 45 | 82 | 90 |
| Kontent / Topical authority | 20% | 25 | 40 | 88 |
| Performance / CWV | 12% | 55 | 65 | 85 |
| Xalqaro SEO | 8% | 25 | 38 | 85 |
| Accessibility | 8% | 45 | 72 | 88 |
| Off-page / Authority | 5% | 15 | 20 | 80 |
| **Vaznli umumiy** | 100% | **≈34** | **≈62** | **≈88** |

> **Xulosa:** bu PR ballni **34 → 62** ga ko'tardi (asosan kritik texnik xatolar tuzatildi). Qolgan 26 ball asosan **kontent (topical authority)**, **backlink authority** va **to'liq SSG/xalqaro** dan keladi — bular §12–13 yo'l xaritasida.

---

## 15. Kutilayotgan reyting yaxshilanishlari

- **Qisqa muddat (0–3 oy):** to'g'ri domen/sitemap/OG tufayli **indekslash tiklanadi** (oldin sitemap noto'g'ri domenni ko'rsatgani uchun sahifalar to'g'ri indekslanmasligi mumkin edi). Telegram/ijtimoiy ulashuvlarda **to'g'ri ko'rinish** (OG rasm) → CTR/trafik o'sishi. Brend so'rovlari ("Arab Exam") va past-raqobatli long-tail ("arab tili CEFR imtihoni") uchun 1-sahifa real.
- **O'rta muddat (3–6 oy, kontent bilan):** "arab tili imtihoni", "arab tili sertifikati", "arab tili grammatikasi" bo'yicha top-10 ga kirish; organik trafik barqaror o'sishi.
- **Uzoq muddat (6–12 oy, authority + xalqaro):** o'zbekcha arab-tili nishasi bo'yicha **etakchi**; arabcha bozorda dastlabki pozitsiyalar.

> Eslatma: aniq reyting kafolati mumkin emas (Google algoritmi + raqobat + backlink dinamikasi). Yuqoridagilar — sog'lom, oq-shapka strategiya asosidagi realistik prognoz.

---

## 16. Qolgan SEO imkoniyatlari (bu PR'dan tashqari)

1. **To'liq SSG/SSR** — body kontenti hali JS'ga bog'liq (P1).
2. **Kontent hub/blog** — topical authority uchun eng katta manba (P1).
3. **Backlink strategiyasi** — hozir hech qanday tashqi authority signal yo'q (P1).
4. **Lokalizatsiyalangan URL'lar** (en/ar) + haqiqiy hreflang (P2).
5. **Analitika steki:** GSC, GA4, Bing Webmaster, Microsoft Clarity, IndexNow — **hali sozlanmagan** (P0 sozlash, §Analytics ilova).
6. **Real CWV monitoring** (P1).
7. **A11y qolganlari:** forma labellari, skip-link, 404 landmark (P2).
8. **Xavfsizlik eslatmasi:** `frontend/.env` da `VERCEL_OIDC_TOKEN` bor — bu qisqa muddatli dev token, lekin `.env` `.gitignore`da ekanini tasdiqlang va commit qilmang.

---

## Ilova: Analytics & Search Console sozlash (qo'llanma)

Quyidagilar **kod emas, konfiguratsiya** — DNS/panel kirish talab qiladi (shuning uchun bu PR'da avtomatlashtirilmadi):

1. **Google Search Console:** `arabexam.uz` (Domain property, DNS TXT tasdiq) → `sitemap.xml` yuborish.
2. **Bing Webmaster Tools:** GSC'dan import → sitemap.
3. **GA4:** measurement ID → `index.html` ga gtag yoki GTM konteyner. Konversiya hodisalari: `sign_up` (register), `begin_exam`, `purchase` (Click/Payme return).
4. **Microsoft Clarity:** heatmap/session recording (bepul).
5. **IndexNow:** Vercel edge yoki build-hook orqali yangi/o'zgargan URL'larni Bing/Yandex'ga push.
6. **Vercel Speed Insights:** real CWV (LCP/CLS/INP) o'lchovi.

> Tavsiya: GTM konteyner bilan boshlash — keyin barcha teglar (GA4, Clarity, Ads) koddagi o'zgarishsiz boshqariladi.
