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

/* ── Ochiq bilim bazasi (o'quv kontenti) uchun sxemalar ───────────── */

export const BASE_URL_EXPORT = BASE_URL;

/**
 * Bitta o'quv sahifasi (dars/mavzu) uchun LearningResource schema.
 * Google va AI-qidiruvga sahifa ta'limiy resurs ekanini, darajasini va
 * qaysi ko'nikmani o'rgatishini aniq ko'rsatadi.
 */
export function buildLearningResourceSchema(opts: {
    name: string;
    description: string;
    path: string;
    educationalLevel?: string;
    teaches?: string | string[];
    lang?: string;
    datePublished?: string;
    dateModified?: string;
    authorName?: string;
    timeRequiredMinutes?: number;
}): Record<string, unknown> {
    return {
        "@context": "https://schema.org",
        "@type": "LearningResource",
        "@id": `${BASE_URL}${opts.path}#lesson`,
        url: `${BASE_URL}${opts.path}`,
        name: opts.name,
        description: opts.description,
        inLanguage: opts.lang ?? "uz",
        learningResourceType: "Lesson",
        educationalLevel: opts.educationalLevel ?? "CEFR A1–C2",
        teaches: opts.teaches ?? "Arab tili",
        isAccessibleForFree: true,
        ...(opts.timeRequiredMinutes
            ? { timeRequired: `PT${opts.timeRequiredMinutes}M` }
            : {}),
        ...(opts.datePublished ? { datePublished: opts.datePublished } : {}),
        ...(opts.dateModified ? { dateModified: opts.dateModified } : {}),
        author: opts.authorName
            ? { "@type": "Organization", name: opts.authorName }
            : { "@id": ORG_ID },
        publisher: { "@id": ORG_ID },
        isPartOf: { "@id": `${BASE_URL}/#website` },
    };
}

/** Blog / yangilik maqolasi (Discover, yangiliklar) uchun schema. */
export function buildArticleSchema(opts: {
    headline: string;
    description: string;
    path: string;
    image?: string;
    datePublished: string;
    dateModified?: string;
    authorName?: string;
    lang?: string;
}): Record<string, unknown> {
    const img = opts.image
        ? opts.image.startsWith("http")
            ? opts.image
            : `${BASE_URL}${opts.image}`
        : `${BASE_URL}/og-image.png`;
    return {
        "@context": "https://schema.org",
        "@type": "Article",
        "@id": `${BASE_URL}${opts.path}#article`,
        mainEntityOfPage: `${BASE_URL}${opts.path}`,
        headline: opts.headline,
        description: opts.description,
        image: img,
        inLanguage: opts.lang ?? "uz",
        datePublished: opts.datePublished,
        dateModified: opts.dateModified ?? opts.datePublished,
        author: {
            "@type": "Organization",
            name: opts.authorName ?? "Arab Exam",
            "@id": ORG_ID,
        },
        publisher: { "@id": ORG_ID },
    };
}

/** "Qanday qilib ..." qo'llanmalar uchun HowTo schema. */
export function buildHowToSchema(opts: {
    name: string;
    description: string;
    steps: Array<{ name: string; text: string }>;
    lang?: string;
}): Record<string, unknown> {
    return {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: opts.name,
        description: opts.description,
        inLanguage: opts.lang ?? "uz",
        step: opts.steps.map((s, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: s.name,
            text: s.text,
        })),
    };
}

/** Mashq/test to'plami uchun Quiz schema. */
export function buildQuizSchema(opts: {
    name: string;
    path: string;
    educationalLevel?: string;
    numberOfQuestions?: number;
    lang?: string;
}): Record<string, unknown> {
    return {
        "@context": "https://schema.org",
        "@type": "Quiz",
        name: opts.name,
        url: `${BASE_URL}${opts.path}`,
        inLanguage: opts.lang ?? "uz",
        educationalLevel: opts.educationalLevel ?? "CEFR A1–C2",
        ...(opts.numberOfQuestions
            ? { numberOfQuestions: opts.numberOfQuestions }
            : {}),
        about: { "@id": ORG_ID },
        isAccessibleForFree: true,
    };
}

/** Muallif/o'qituvchi profili uchun Person schema (E-E-A-T). */
export function buildPersonSchema(opts: {
    name: string;
    jobTitle?: string;
    description?: string;
    path?: string;
    sameAs?: string[];
    knowsAbout?: string[];
}): Record<string, unknown> {
    return {
        "@context": "https://schema.org",
        "@type": "Person",
        ...(opts.path ? { "@id": `${BASE_URL}${opts.path}#person` } : {}),
        name: opts.name,
        ...(opts.jobTitle ? { jobTitle: opts.jobTitle } : {}),
        ...(opts.description ? { description: opts.description } : {}),
        ...(opts.sameAs ? { sameAs: opts.sameAs } : {}),
        ...(opts.knowsAbout ? { knowsAbout: opts.knowsAbout } : {}),
        worksFor: { "@id": ORG_ID },
    };
}

/**
 * Hub/ro'yxat sahifasi uchun CollectionPage + ItemList schema.
 * Bilim bazasi indeks sahifasi kabi to'plam sahifalarida ishlatiladi.
 */
export function buildCollectionPageSchema(opts: {
    name: string;
    description: string;
    path: string;
    items: Array<{ name: string; path: string }>;
    lang?: string;
}): Record<string, unknown> {
    return {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": `${BASE_URL}${opts.path}#collection`,
        url: `${BASE_URL}${opts.path}`,
        name: opts.name,
        description: opts.description,
        inLanguage: opts.lang ?? "uz",
        isPartOf: { "@id": `${BASE_URL}/#website` },
        mainEntity: {
            "@type": "ItemList",
            numberOfItems: opts.items.length,
            itemListElement: opts.items.map((it, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: it.name,
                url: `${BASE_URL}${it.path}`,
            })),
        },
    };
}

/**
 * Bir nechta schema-obyektini bitta @graph ichiga birlashtiradi.
 * Bir sahifada bir necha script o'rniga yagona, o'zaro @id bilan bog'langan
 * graf uzatish — Google uchun eng toza usul.
 */
export function buildGraph(
    nodes: Array<Record<string, unknown>>
): Record<string, unknown> {
    return {
        "@context": "https://schema.org",
        "@graph": nodes.map((n) => {
            // Ichki tugunlarda takroriy @context kerak emas
            const rest = { ...n };
            delete rest["@context"];
            return rest;
        }),
    };
}
