import { Helmet } from "react-helmet-async";

interface StructuredDataProps {
    data: Record<string, unknown>;
}

/** Injects a JSON-LD script tag into <head> */
export function StructuredData({ data }: StructuredDataProps) {
    return (
        <Helmet>
            <script type="application/ld+json">{JSON.stringify(data)}</script>
        </Helmet>
    );
}

/* ── Pre-built schema objects ────────────────────── */

const BASE_URL = "https://arabexam.uz";
const ORG_ID = `${BASE_URL}/#organization`;

export const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "@id": ORG_ID,
    name: "Arab Exam",
    url: `${BASE_URL}/`,
    logo: `${BASE_URL}/logo.png`,
    image: `${BASE_URL}/og-image.png`,
    description:
        "Arab tili CEFR imtihon platformasi. A1–C2 darajalar uchun mock imtihon, AI baholash va sertifikat.",
    email: "support@arabexam.uz",
    areaServed: "UZ",
    availableLanguage: ["uz", "en", "ar"],
    sameAs: ["https://t.me/arabexam_uz", "https://t.me/arabexam_kanal"],
    contactPoint: {
        "@type": "ContactPoint",
        email: "support@arabexam.uz",
        contactType: "customer support",
        availableLanguage: ["uz", "en", "ar"],
    },
};

export const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
    name: "Arab Exam",
    url: `${BASE_URL}/`,
    inLanguage: ["uz", "en", "ar"],
    publisher: { "@id": ORG_ID },
};

/**
 * CEFR arab tili imtihoniga tayyorgarlik dasturi uchun Course schema.
 * Provider — Arab Exam tashkiloti. Bepul demo + pullik mock imtihon takliflari.
 */
export const courseSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Arab tili CEFR mock imtihon dasturi (A1–C2)",
    description:
        "Arab tili bilimini CEFR (A1–C2) bo'yicha baholovchi mock imtihonlar: listening, reading, writing, speaking va grammatika. AI baholash, darhol feedback va PDF sertifikat.",
    url: `${BASE_URL}/`,
    inLanguage: "uz",
    teaches: ["Listening", "Reading", "Writing", "Speaking", "Grammatika"],
    educationalLevel: "CEFR A1–C2",
    provider: {
        "@type": "EducationalOrganization",
        "@id": ORG_ID,
        name: "Arab Exam",
        url: `${BASE_URL}/`,
    },
    hasCourseInstance: {
        "@type": "CourseInstance",
        courseMode: "online",
        inLanguage: "uz",
    },
    offers: [
        {
            "@type": "Offer",
            category: "Bepul demo",
            price: "0",
            priceCurrency: "UZS",
            availability: "https://schema.org/InStock",
            url: `${BASE_URL}/register`,
        },
        {
            "@type": "Offer",
            category: "To'liq mock imtihon",
            price: "50000",
            priceCurrency: "UZS",
            availability: "https://schema.org/InStock",
        },
    ],
};

/** Sahifa uchun WebPage schema (breadcrumb bilan bog'lash mumkin) */
export function buildWebPageSchema(opts: {
    name: string;
    description: string;
    path: string;
    lang?: string;
}): Record<string, unknown> {
    return {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${BASE_URL}${opts.path}#webpage`,
        url: `${BASE_URL}${opts.path}`,
        name: opts.name,
        description: opts.description,
        inLanguage: opts.lang ?? "uz",
        isPartOf: { "@id": `${BASE_URL}/#website` },
        about: { "@id": ORG_ID },
    };
}

export function buildFAQSchema(
    items: Array<{ question: string; answer: string }>
): Record<string, unknown> {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: item.answer,
            },
        })),
    };
}

export function buildBreadcrumbSchema(
    items: Array<{ name: string; url: string }>
): Record<string, unknown> {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    };
}
