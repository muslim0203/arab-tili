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
            {noindex && <meta name="robots" content="noindex,nofollow" />}

            {/* Open Graph */}
            <meta property="og:type" content={ogType} />
            <meta property="og:site_name" content={SITE_NAME} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:image" content={ogImageUrl} />
            <meta property="og:locale" content={lang === "ar" ? "ar_SA" : lang === "en" ? "en_US" : "uz_UZ"} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={ogImageUrl} />

            {/* Hreflang */}
            <link rel="alternate" hrefLang="uz" href={`${BASE_URL}${canonicalPath}`} />
            <link rel="alternate" hrefLang="en" href={`${BASE_URL}${canonicalPath}?lang=en`} />
            <link rel="alternate" hrefLang="ar" href={`${BASE_URL}${canonicalPath}?lang=ar`} />
            <link rel="alternate" hrefLang="x-default" href={`${BASE_URL}${canonicalPath}`} />
        </Helmet>
    );
}
