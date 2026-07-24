import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SiteHeader } from "@/components/SiteHeader";
import { SEO } from "@/components/SEO";
import {
    StructuredData,
    buildGraph,
    buildCollectionPageSchema,
    buildBreadcrumbSchema,
} from "@/components/StructuredData";
import { kbLessons } from "@/data/knowledge-base";

const BASE = "https://arabexam.uz";

/**
 * Ochiq bilim bazasi hub (indeks) sahifasi.
 * Barcha darslarni klaster bo'yicha ro'yxatlaydi va CollectionPage +
 * ItemList structured data beradi. Yangi darslar avtomatik ko'rinadi.
 */
export function OrganIndex() {
    const { i18n } = useTranslation();

    // Klaster bo'yicha guruhlash
    const clusters = kbLessons.reduce<Record<string, typeof kbLessons>>((acc, l) => {
        (acc[l.cluster] ??= []).push(l);
        return acc;
    }, {});

    const graph = buildGraph([
        buildCollectionPageSchema({
            name: "Arab tili bilim bazasi",
            description:
                "Arab tilini o'rganish bo'yicha bepul darslar: alifbo, harakatlar, grammatika, lug'at va CEFR imtihoniga tayyorgarlik.",
            path: "/organ",
            items: kbLessons.map((l) => ({ name: l.title, path: `/organ/${l.slug}` })),
        }),
        buildBreadcrumbSchema([
            { name: "Bosh sahifa", url: `${BASE}/` },
            { name: "Bilim bazasi", url: `${BASE}/organ` },
        ]),
    ]);

    return (
        <div className="min-h-screen bg-muted/30">
            <SEO
                title="Arab tili bilim bazasi — bepul darslar"
                description="Arab tilini noldan o'rganish uchun bepul darslar: alifbo, harakatlar, grammatika va CEFR imtihoniga tayyorgarlik. O'zbek tilida, misollar bilan."
                canonicalPath="/organ"
                lang={i18n.language}
            />
            <StructuredData data={graph} />
            <SiteHeader lang={i18n.language} onLangChange={(code) => i18n.changeLanguage(code)} />

            <main className="container mx-auto max-w-3xl px-4 py-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Arab tili bilim bazasi
                    </h1>
                    <p className="mt-2 max-w-2xl text-muted-foreground">
                        Arab tilini noldan o'rganish uchun bepul, tizimli darslar. Har bir dars
                        misollar, lug'at va ko'p so'raladigan savollar bilan. CEFR imtihoniga
                        tayyorgarlik ko'ring va bilimingizni platformamizda sinab ko'ring.
                    </p>
                </header>

                {Object.entries(clusters).map(([cluster, lessons]) => (
                    <section key={cluster} className="mb-8">
                        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            {cluster}
                        </h2>
                        <div className="grid gap-3">
                            {lessons.map((l) => (
                                <Link
                                    key={l.slug}
                                    to={`/organ/${l.slug}`}
                                    className="block rounded-xl border bg-background p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
                                >
                                    <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className="rounded-full bg-muted px-2 py-0.5">CEFR {l.level}</span>
                                        <span>{l.readingMinutes} daq.</span>
                                    </div>
                                    <h3 className="font-semibold text-foreground">{l.title}</h3>
                                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{l.description}</p>
                                </Link>
                            ))}
                        </div>
                    </section>
                ))}
            </main>
        </div>
    );
}

export default OrganIndex;
