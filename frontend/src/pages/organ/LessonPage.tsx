import { useParams, Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SiteHeader } from "@/components/SiteHeader";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
    StructuredData,
    buildGraph,
    buildLearningResourceSchema,
    buildFAQSchema,
    buildBreadcrumbSchema,
} from "@/components/StructuredData";
import { getLessonBySlug } from "@/data/knowledge-base";

const BASE = "https://arabexam.uz";

/**
 * Ochiq bilim bazasi darsi shabloni.
 * Ma'lumot (KbLesson) asosida barcha SEO bloklarini generatsiya qiladi:
 * xulosa, o'quv maqsadlari, dars, misollar, xatolar, FAQ, lug'at,
 * bog'liq darslar, CTA + LearningResource/FAQ/Breadcrumb structured data.
 * Yangi dars qo'shish uchun faqat knowledge-base.ts ga yozuv qo'shiladi.
 */
export function LessonPage() {
    const { slug } = useParams<{ slug: string }>();
    const { i18n } = useTranslation();
    const lesson = slug ? getLessonBySlug(slug) : undefined;

    if (!lesson) {
        return <Navigate to="/organ" replace />;
    }

    const path = `/organ/${lesson.slug}`;

    const graph = buildGraph([
        buildLearningResourceSchema({
            name: lesson.title,
            description: lesson.description,
            path,
            educationalLevel: `CEFR ${lesson.level}`,
            teaches: lesson.cluster,
            datePublished: lesson.updated,
            dateModified: lesson.updated,
            authorName: lesson.author,
            timeRequiredMinutes: lesson.readingMinutes,
        }),
        buildFAQSchema(lesson.faq),
        buildBreadcrumbSchema([
            { name: "Bosh sahifa", url: `${BASE}/` },
            { name: "Bilim bazasi", url: `${BASE}/organ` },
            { name: lesson.title, url: `${BASE}${path}` },
        ]),
    ]);

    return (
        <div className="min-h-screen bg-muted/30">
            <SEO
                title={lesson.metaTitle}
                description={lesson.description}
                canonicalPath={path}
                ogType="article"
                lang={i18n.language}
            />
            <StructuredData data={graph} />
            <SiteHeader lang={i18n.language} onLangChange={(code) => i18n.changeLanguage(code)} />

            <main className="container mx-auto max-w-3xl px-4 py-8">
                {/* Breadcrumb */}
                <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
                    <ol className="flex flex-wrap items-center gap-1.5">
                        <li><Link to="/" className="hover:text-foreground">Bosh sahifa</Link></li>
                        <li aria-hidden="true">/</li>
                        <li><Link to="/organ" className="hover:text-foreground">Bilim bazasi</Link></li>
                        <li aria-hidden="true">/</li>
                        <li className="text-foreground">{lesson.cluster}</li>
                    </ol>
                </nav>

                <article>
                    <header className="mb-6">
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium">
                            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-primary">{lesson.cluster}</span>
                            <span className="rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground">CEFR {lesson.level}</span>
                            <span className="text-muted-foreground">{lesson.readingMinutes} daq. o'qish</span>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">{lesson.title}</h1>
                        <p className="mt-2 text-xs text-muted-foreground">
                            Muallif: {lesson.author}
                            {lesson.reviewedBy ? ` · Ko'rib chiqdi: ${lesson.reviewedBy}` : ""}
                            {" · Oxirgi yangilanish: "}{lesson.updated}
                        </p>
                    </header>

                    {/* Xulosa (answer-first) */}
                    <div className="mb-8 rounded-xl border-l-4 border-primary bg-background p-4 shadow-sm">
                        <p className="text-base leading-relaxed text-foreground">{lesson.summary}</p>
                    </div>

                    {/* O'quv maqsadlari */}
                    <section className="mb-8">
                        <h2 className="mb-3 text-xl font-semibold">Ushbu darsdan nimani o'rganasiz</h2>
                        <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
                            {lesson.objectives.map((o, i) => <li key={i}>{o}</li>)}
                        </ul>
                    </section>

                    {/* Zaruriy bilim */}
                    {lesson.prerequisites.length > 0 && (
                        <section className="mb-8">
                            <h2 className="mb-3 text-xl font-semibold">Boshlashdan oldin</h2>
                            <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
                                {lesson.prerequisites.map((p, i) => <li key={i}>{p}</li>)}
                            </ul>
                        </section>
                    )}

                    {/* Asosiy dars */}
                    {lesson.sections.map((sec, i) => (
                        <section key={i} className="mb-8">
                            <h2 className="mb-3 text-xl font-semibold">{sec.heading}</h2>
                            <div className="space-y-3 leading-relaxed text-muted-foreground">
                                {sec.body.map((para, j) => <p key={j}>{para}</p>)}
                            </div>
                        </section>
                    ))}

                    {/* Misollar */}
                    <section className="mb-8">
                        <h2 className="mb-3 text-xl font-semibold">Misollar</h2>
                        <div className="overflow-x-auto rounded-xl border bg-background">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                                        <th className="px-4 py-2 font-medium">Arabcha</th>
                                        <th className="px-4 py-2 font-medium">Transliteratsiya</th>
                                        <th className="px-4 py-2 font-medium">O'zbekcha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lesson.examples.map((ex, i) => (
                                        <tr key={i} className="border-b last:border-0">
                                            <td className="px-4 py-2 text-2xl" dir="rtl" lang="ar">{ex.arabic}</td>
                                            <td className="px-4 py-2 italic text-muted-foreground">{ex.translit}</td>
                                            <td className="px-4 py-2 text-foreground">{ex.uz}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Keng tarqalgan xatolar */}
                    <section className="mb-8">
                        <h2 className="mb-3 text-xl font-semibold">Keng tarqalgan xatolar</h2>
                        <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
                            {lesson.commonMistakes.map((m, i) => <li key={i}>{m}</li>)}
                        </ul>
                    </section>

                    {/* Lug'at */}
                    <section className="mb-8">
                        <h2 className="mb-3 text-xl font-semibold">Darsdagi lug'at</h2>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {lesson.vocabulary.map((v, i) => (
                                <div key={i} className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2">
                                    <span className="text-xl" dir="rtl" lang="ar">{v.arabic}</span>
                                    <span className="text-sm italic text-muted-foreground">{v.translit}</span>
                                    <span className="ml-auto text-sm text-foreground">{v.uz}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* FAQ */}
                    <section className="mb-8">
                        <h2 className="mb-3 text-xl font-semibold">Ko'p so'raladigan savollar</h2>
                        <div className="space-y-3">
                            {lesson.faq.map((f, i) => (
                                <details key={i} className="group rounded-xl border bg-background p-4">
                                    <summary className="cursor-pointer list-none font-medium text-foreground">
                                        {f.question}
                                    </summary>
                                    <p className="mt-2 leading-relaxed text-muted-foreground">{f.answer}</p>
                                </details>
                            ))}
                        </div>
                    </section>

                    {/* CTA */}
                    <section className="mb-8 rounded-xl border bg-primary/5 p-6 text-center">
                        <h2 className="mb-2 text-xl font-semibold">{lesson.cta.heading}</h2>
                        <p className="mx-auto mb-4 max-w-md text-muted-foreground">{lesson.cta.text}</p>
                        <Button asChild size="lg">
                            <Link to={lesson.cta.href}>{lesson.cta.label}</Link>
                        </Button>
                    </section>

                    {/* Bog'liq darslar */}
                    <section>
                        <h2 className="mb-3 text-xl font-semibold">Bog'liq darslar</h2>
                        <ul className="space-y-2">
                            {lesson.related.map((r, i) => (
                                <li key={i}>
                                    <Link
                                        to={r.slug ? `/organ/${r.slug}` : "/organ"}
                                        className="text-primary hover:underline"
                                    >
                                        {r.title} →
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                </article>
            </main>
        </div>
    );
}

export default LessonPage;
