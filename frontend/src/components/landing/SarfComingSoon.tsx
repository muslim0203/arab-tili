import { motion } from "framer-motion";
import { BookOpenText, Sparkles, Brain, Layers, GraduationCap, Rocket } from "lucide-react";

const FEATURES = [
    {
        icon: BookOpenText,
        title: "Sarf qoidalari",
        desc: "Fe'l tuslashlari, ism shakllari va barcha sarf qoidalari bir joyda",
        color: "from-emerald-500 to-teal-500",
    },
    {
        icon: Brain,
        title: "AI bilan mashq",
        desc: "Sun'iy intellekt yordamida interaktiv mashqlar va tushuntirishlar",
        color: "from-violet-500 to-purple-500",
    },
    {
        icon: Layers,
        title: "Bosqichma-bosqich",
        desc: "A1 dan C2 gacha barcha darajalar uchun tizimli darslar",
        color: "from-blue-500 to-indigo-500",
    },
    {
        icon: GraduationCap,
        title: "Imtihonga tayyorgarlik",
        desc: "Sarf bo'yicha maxsus test va imtihonlar bilan bilimni mustahkamlang",
        color: "from-orange-500 to-amber-500",
    },
];

export function SarfComingSoon() {
    return (
        <section
            className="relative overflow-hidden py-20 sm:py-28"
            aria-labelledby="sarf-heading"
        >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />

            {/* Decorative pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />

            {/* Arabic calligraphy decorative elements */}
            <div className="absolute top-10 left-10 text-6xl font-arabic text-white/[0.04] select-none pointer-events-none" aria-hidden>
                صَرْف
            </div>
            <div className="absolute bottom-10 right-10 text-8xl font-arabic text-white/[0.03] select-none pointer-events-none" aria-hidden>
                الصرف
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 -right-20 text-[12rem] font-arabic text-white/[0.02] select-none pointer-events-none leading-none" aria-hidden>
                ع
            </div>

            {/* Glowing orbs */}
            <div className="absolute top-20 right-1/4 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="absolute bottom-20 left-1/4 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

            <div className="container relative mx-auto px-4">
                {/* Header */}
                <motion.div
                    className="mx-auto max-w-3xl text-center"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.6 }}
                >
                    {/* Badge */}
                    <motion.div
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-400 mb-6"
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                    >
                        <Rocket className="h-4 w-4" />
                        <span>Tez orada ishga tushadi</span>
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                    </motion.div>

                    <h2
                        id="sarf-heading"
                        className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
                    >
                        <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                            Sarf Platformasi
                        </span>
                    </h2>

                    <p className="mt-2 text-lg text-white/60 sm:text-xl">
                        Arab tili morfologiyasini chuqur o'rganing
                    </p>

                    <p className="mt-6 text-base text-white/40 max-w-2xl mx-auto leading-relaxed">
                        Fe'l tuslashlari, ism o'zgarishlari, bablar tizimi va boshqa ko'plab sarf qoidalarini
                        zamonaviy va interaktiv platforma orqali o'rganing. AI texnologiyasi yordamida
                        har bir talabaning darajasiga mos mashq va tushuntirishlar taqdim etiladi.
                    </p>
                </motion.div>

                {/* Decorative Arabic morphology preview */}
                <motion.div
                    className="mx-auto mt-12 max-w-2xl"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 sm:p-8">
                        {/* Arabic verb conjugation example */}
                        <div className="text-center space-y-4">
                            <p className="text-xs uppercase tracking-widest text-emerald-400/80 font-medium">
                                Misol: Fa'ala babi — فَعَلَ
                            </p>

                            <div className="flex items-center justify-center gap-3 flex-wrap" dir="rtl">
                                {[
                                    { form: "كَتَبَ", label: "Mozi" },
                                    { form: "يَكْتُبُ", label: "Muzore'" },
                                    { form: "اُكْتُبْ", label: "Amr" },
                                    { form: "كِتَابَة", label: "Masdar" },
                                    { form: "كَاتِب", label: "Ism foil" },
                                    { form: "مَكْتُوب", label: "Ism maful" },
                                ].map((item, i) => (
                                    <motion.div
                                        key={item.form}
                                        className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 min-w-[80px]"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.3, delay: 0.3 + i * 0.06 }}
                                    >
                                        <span className="text-xl font-arabic text-white font-medium">
                                            {item.form}
                                        </span>
                                        <span className="text-[10px] text-white/40 font-medium">
                                            {item.label}
                                        </span>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="flex items-center gap-3 justify-center pt-2">
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                <Sparkles className="h-4 w-4 text-emerald-400/60" />
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Feature cards */}
                <motion.div
                    className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4"
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-60px" }}
                    variants={{
                        hidden: {},
                        show: { transition: { staggerChildren: 0.08 } },
                    }}
                >
                    {FEATURES.map((f) => (
                        <motion.div
                            key={f.title}
                            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                            className="group rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 transition-all duration-300 hover:bg-white/10 hover:border-white/20"
                        >
                            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${f.color} shadow-lg`}>
                                <f.icon className="h-5 w-5 text-white" aria-hidden />
                            </div>
                            <h3 className="mt-3 font-semibold text-white">{f.title}</h3>
                            <p className="mt-1.5 text-sm text-white/50 leading-relaxed">{f.desc}</p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* CTA */}
                <motion.div
                    className="mx-auto mt-12 max-w-md text-center"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                >
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-6 py-3 text-sm text-white/50">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        </span>
                        <span>Ishlab chiqilmoqda — </span>
                        <span className="font-medium text-emerald-400">
                            2026-yil bahor
                        </span>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
