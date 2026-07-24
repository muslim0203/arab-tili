import { Helmet } from "react-helmet-async";

const SITE_NAME = "Arab Exam";
const BASE_URL = "https://arabexam.uz";
const DEFAULT_OG_IMAGE = "/og-image.png";
const DEFAULT_DESCRIPTION =
    "Arab Exam – Arab tili CEFR imtihon platformasi. A1–C2 darajalar uchun mock imtihon, AI baholash va sertifikat.";

export interface SEOProps {
    /** Page title – will be appended with " | Arab Exam" unless isHome */
    title?: string;
    /** Meta description (max ~155 chars recommended) */
    description?: string;
    /** Canonical path, e.g. "/tizim-haqida" */
    canonicalPath?: string;
    /** Open Graph image path (absolute or relative to public) */
    ogImage?: string;
    /** og:type – default "website" */
    ogType?: string;
    /** Set true to add noindex,nofollow */
    noindex?: boolean;
    /** Current language for hreflang */
    lang?: string;
    /** Is this the home page (don't append brand to title) */
    isHome?: boolean;
}

export function SEO({
    title,
    description = DEFAULT_DESCRIPTION,
    canonicalPath = "/",
    ogImage = DEFAULT_OG_IMAGE,
    ogType = "website",
    noindex = false,
    lang = "uz",
    isHome = false,
}: SEOProps) {
    const fullTitle = isHome
        ? (title ?? `${SITE_NAME} – Arab tili CEFR imtihon platformasi`)
        : title
            ? `${title} | ${SITE_NAME}`
            : SITE_NAME;

    const canonicalUrl = `${BASE_URL}${canonicalPath}`;
    const ogImageUrl = ogImage.startsWith("http") ? ogImage : `${BASE_URL}${ogImage}`;

    return (
        <Helmet>
            {/* Primary */}
            <html lang={lang} />
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={canonicalUrl} />

            {/* Robots */}
            {noindex ? (
                <meta name="robots" content="noindex,nofollow" />
            ) : (
                <meta
                    name="robots"
                    content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
                />
            )}

            {/* Open Graph */}
            <meta property="og:type" content={ogType} />
            <meta property="og:site_name" content={SITE_NAME} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:image" content={ogImageUrl} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:alt" content={fullTitle} />
            <meta property="og:locale" content={lang === "ar" ? "ar_SA" : lang === "en" ? "en_US" : "uz_UZ"} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={ogImageUrl} />
            <meta name="twitter:image:alt" content={fullTitle} />

            {/*
              Hreflang ATAYLAB olib tashlandi: `?lang=` variantlari server tomonda
              alohida kontent bermaydi (i18n faqat klient tomonda). Yolg'on hreflang
              Google tomonidan e'tiborsiz qoldiriladi yoki xato sifatida belgilanadi.
              To'g'ri yechim — /en/… va /ar/… lokalizatsiyalangan yo'llar (yo'l xaritasida).
            */}
        </Helmet>
    );
}
