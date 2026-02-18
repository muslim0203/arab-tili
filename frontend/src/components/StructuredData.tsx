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

export const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "Arab Exam",
    url: "https://arabexam.uz",
    description:
        "Arab tili CEFR imtihon platformasi. A1–C2 darajalar uchun mock imtihon, AI baholash va sertifikat.",
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
    name: "Arab Exam",
    url: "https://arabexam.uz",
    inLanguage: ["uz", "en", "ar"],
};

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
