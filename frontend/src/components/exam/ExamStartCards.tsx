// ─────────────────────────────────────────────────
// Exam Start Cards (3 cards) – O'zbek tilida
// ─────────────────────────────────────────────────

import { BookOpen, Award, GraduationCap, Lock, ArrowRight, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ExamStartCardsProps {
    onStartAtTaanal: () => void;
    onStartSpeakingWriting: () => void;
}

export function ExamStartCards({ onStartAtTaanal, onStartSpeakingWriting }: ExamStartCardsProps) {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
            <div className="max-w-5xl w-full">
                {/* Back button */}
                <button
                    onClick={() => navigate(-1)}
                    className="mb-6 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Orqaga qaytish
                </button>

                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-4">
                        Arab tili imtihonlari
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        O'zingizga mos imtihon turini tanlang
                    </p>
                </div>

                {/* Cards Grid */}
                <div className="grid md:grid-cols-3 gap-6">
                    {/* Card 1: Speaking + Writing (FREE) */}
                    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-lg hover:shadow-secondary/10 hover:border-secondary/50">
                        <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">
                            <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                                <BookOpen className="w-7 h-7 text-secondary" />
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <h2 className="text-xl font-bold text-card-foreground">
                                    Gapirish va Yozish
                                </h2>
                                <span className="px-2 py-0.5 text-xs font-semibold bg-secondary/15 text-secondary rounded-full">
                                    Bepul
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                                Arab tilida gapirish va yozish ko'nikmalarini tekshiring
                            </p>
                            <p className="text-xs text-muted-foreground mb-4">
                                Kuniga 2 ta bepul urinish
                            </p>
                            <ul className="text-xs text-muted-foreground space-y-1 mb-5">
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                                    Yozish — 1 ta vazifa (15 ball)
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                                    Gapirish — 1 ta savol (5 ball)
                                </li>
                            </ul>
                            <button
                                onClick={onStartSpeakingWriting}
                                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-secondary to-secondary/80 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-secondary/30 transition-all duration-200 active:scale-[0.98]"
                            >
                                Imtihonni boshlash
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Card 2: At-Taanal (PAID) – main CTA */}
                    <div className="group relative overflow-hidden rounded-2xl border-2 border-primary/50 bg-card/90 backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:border-primary scale-[1.02] md:scale-105">
                        {/* Popular badge */}
                        <div className="absolute top-0 right-0 bg-gradient-to-l from-primary to-primary/80 text-primary-foreground text-xs font-bold px-4 py-1 rounded-bl-xl">
                            ⭐ Eng ko'p tanlanган
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">
                            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Award className="w-7 h-7 text-primary" />
                            </div>
                            <h2 className="text-xl font-bold text-card-foreground mb-1">
                                At-Ta'anul imtihoni
                            </h2>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl font-bold text-primary">50,000</span>
                                <span className="text-sm text-muted-foreground">so'm</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-4">
                                To'liq imtihon: Grammatika, O'qish, Tinglash, Yozish, Gapirish
                            </p>
                            <ul className="text-xs text-muted-foreground space-y-1 mb-6">
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    Grammatika — 30 ta savol
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    O'qish — 3 ta matn
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    Tinglash — 3 bosqich
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    Yozish — 2 ta vazifa
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    Gapirish — 6 ta savol
                                </li>
                            </ul>
                            <button
                                onClick={onStartAtTaanal}
                                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/30 transition-all duration-200 active:scale-[0.98]"
                            >
                                Imtihonni boshlash
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Card 3: National Certificate (COMING SOON) */}
                    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 opacity-50 cursor-not-allowed">
                        <div className="absolute inset-0 bg-gradient-to-br from-muted/20 to-transparent" />
                        <div className="relative z-10">
                            <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mb-4">
                                <GraduationCap className="w-7 h-7 text-muted-foreground" />
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <h2 className="text-xl font-bold text-muted-foreground">
                                    Milliy sertifikat
                                </h2>
                                <Lock className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground mb-6">
                                Arab tilidan rasmiy sertifikat — tez kunlarda
                            </p>
                            <button
                                disabled
                                className="w-full py-3 px-4 rounded-xl bg-muted text-muted-foreground font-medium text-sm flex items-center justify-center gap-2 cursor-not-allowed"
                            >
                                Tez kunlarda
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
