import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Save, X, BookOpen, Eye, EyeOff } from "lucide-react";

interface ReadingQ { id: string; prompt: string; options: string; correctIndex: number; orderIndex: number; }
interface Passage {
    id: string; difficulty: string; passageType: string; text: string;
    readingTimeSeconds: number; questionTimeSeconds: number; createdAt: string;
    questions: ReadingQ[];
}
interface Paginated { items: Passage[]; total: number; page: number; pageSize: number; totalPages: number; }

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const DIFF_LABEL: Record<string, string> = { easy: "Oson", medium: "O'rta", hard: "Qiyin" };
const DIFF_BADGE: Record<string, string> = {
    easy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    hard: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};
const TYPE_LABEL: Record<string, string> = { short: "Qisqa (80-100)", medium: "O'rta (150-180)", long: "Uzun (250-300)" };

const DEFAULTS: Record<string, { readingTime: number; questionTime: number; questionCount: number }> = {
    short: { readingTime: 120, questionTime: 360, questionCount: 6 },
    medium: { readingTime: 180, questionTime: 480, questionCount: 8 },
    long: { readingTime: 300, questionTime: 1200, questionCount: 10 },
};

interface QForm { prompt: string; options: string[]; correctIndex: number; }

const emptyQForm = (): QForm => ({ prompt: "", options: ["", "", "", ""], correctIndex: 0 });

interface PForm {
    difficulty: string; passageType: string; text: string;
    readingTimeSeconds: number; questionTimeSeconds: number;
    questions: QForm[];
}

const emptyPForm = (): PForm => ({
    difficulty: "easy", passageType: "short", text: "",
    readingTimeSeconds: 120, questionTimeSeconds: 360,
    questions: Array.from({ length: 6 }, emptyQForm),
});

export function AdminReading() {
    const [data, setData] = useState<Paginated | null>(null);
    const [page, setPage] = useState(1);
    const [filterDiff, setFilterDiff] = useState("");
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<string | null>(null);
    const [form, setForm] = useState<PForm>(emptyPForm());
    const [saving, setSaving] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page), pageSize: "10" });
        if (filterDiff) params.set("difficulty", filterDiff);
        const d = await api<Paginated>(`/admin/reading?${params}`);
        setData(d);
        setLoading(false);
    }, [page, filterDiff]);

    useEffect(() => { load(); }, [load]);

    const openNew = () => {
        setForm(emptyPForm());
        setEditing("new");
    };

    const openEdit = (p: Passage) => {
        const qs: QForm[] = p.questions.map((q) => ({
            prompt: q.prompt,
            options: JSON.parse(q.options) as string[],
            correctIndex: q.correctIndex,
        }));
        setForm({
            difficulty: p.difficulty, passageType: p.passageType, text: p.text,
            readingTimeSeconds: p.readingTimeSeconds,
            questionTimeSeconds: p.questionTimeSeconds,
            questions: qs,
        });
        setEditing(p.id);
    };

    const handleTypeChange = (type: string) => {
        const d = DEFAULTS[type];
        setForm((f) => ({
            ...f,
            passageType: type,
            readingTimeSeconds: d.readingTime,
            questionTimeSeconds: d.questionTime,
            questions: Array.from({ length: d.questionCount }, (_, i) => f.questions[i] || emptyQForm()),
        }));
    };

    const updateQ = (idx: number, field: keyof QForm, value: unknown) => {
        setForm((f) => {
            const qs = [...f.questions];
            qs[idx] = { ...qs[idx], [field]: value };
            return { ...f, questions: qs };
        });
    };

    const save = async () => {
        if (!form.text.trim()) { alert("Matn kiritilishi shart"); return; }
        const expectedCount = DEFAULTS[form.passageType]?.questionCount || 6;
        const validQs = form.questions.filter((q) => q.prompt.trim() && q.options.every((o) => o.trim()));
        if (validQs.length < expectedCount) {
            alert(`Bu passage turi uchun kamida ${expectedCount} ta savol to'ldirilishi kerak. Hozir ${validQs.length} ta to'ldirilgan.`);
            return;
        }

        setSaving(true);
        try {
            const body = {
                difficulty: form.difficulty,
                passageType: form.passageType,
                text: form.text,
                readingTimeSeconds: form.readingTimeSeconds,
                questionTimeSeconds: form.questionTimeSeconds,
                questions: validQs.map((q) => ({ prompt: q.prompt, options: q.options, correctIndex: q.correctIndex })),
            };
            if (editing === "new") {
                await api("/admin/reading", { method: "POST", body });
            } else {
                await api(`/admin/reading/${editing}`, { method: "PUT", body });
            }
            setEditing(null);
            await load();
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : "Xatolik");
        } finally {
            setSaving(false);
        }
    };

    const remove = async (id: string) => {
        if (!confirm("Passage va barcha savollarini o'chirmoqchimisiz?")) return;
        await api(`/admin/reading/${id}`, { method: "DELETE" });
        await load();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">📖 O'qish (Reading) Passages</h1>
                    <p className="text-sm text-muted-foreground">Qisqa (6 savol), O'rta (8 savol), Uzun (10 savol)</p>
                </div>
                <Button onClick={openNew} className="gap-2 rounded-xl">
                    <Plus className="h-4 w-4" /> Yangi passage
                </Button>
            </div>

            {/* Filter */}
            <div className="flex gap-2">
                <Button variant={filterDiff === "" ? "secondary" : "ghost"} size="sm" className="rounded-lg" onClick={() => { setFilterDiff(""); setPage(1); }}>Barchasi</Button>
                {DIFFICULTIES.map((d) => (
                    <Button key={d} variant={filterDiff === d ? "secondary" : "ghost"} size="sm" className="rounded-lg" onClick={() => { setFilterDiff(d); setPage(1); }}>
                        {DIFF_LABEL[d]}
                    </Button>
                ))}
            </div>

            {/* Edit form */}
            {editing && (
                <div className="rounded-xl border border-primary/30 bg-card p-5 shadow-md space-y-5">
                    <h3 className="font-semibold">{editing === "new" ? "➕ Yangi passage" : "✏️ Tahrirlash"}</h3>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <label className="text-sm font-medium">Qiyinlik</label>
                            <select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}>
                                {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFF_LABEL[d]}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Passage turi</label>
                            <select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.passageType} onChange={(e) => handleTypeChange(e.target.value)}>
                                {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-sm font-medium">O'qish (sek)</label>
                                <Input type="number" className="mt-1" value={form.readingTimeSeconds} onChange={(e) => setForm((f) => ({ ...f, readingTimeSeconds: Number(e.target.value) }))} />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Javob (sek)</label>
                                <Input type="number" className="mt-1" value={form.questionTimeSeconds} onChange={(e) => setForm((f) => ({ ...f, questionTimeSeconds: Number(e.target.value) }))} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium">Matn (عربي)</label>
                        <textarea
                            dir="rtl"
                            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[120px]"
                            value={form.text}
                            onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                            placeholder="اكتب النص العربي هنا..."
                        />
                    </div>

                    {/* Questions */}
                    <div>
                        <h4 className="font-medium mb-3">Savollar ({form.questions.length} ta)</h4>
                        <div className="space-y-4">
                            {form.questions.map((q, qi) => (
                                <div key={qi} className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Savol {qi + 1}</span>
                                        <select className="rounded border border-input bg-background px-2 py-1 text-xs" value={q.correctIndex} onChange={(e) => updateQ(qi, "correctIndex", Number(e.target.value))}>
                                            {[0, 1, 2, 3].map((i) => <option key={i} value={i}>To'g'ri: {String.fromCharCode(65 + i)}</option>)}
                                        </select>
                                    </div>
                                    <textarea dir="rtl" className="w-full rounded border border-input bg-background px-3 py-1.5 text-sm" value={q.prompt} onChange={(e) => updateQ(qi, "prompt", e.target.value)} placeholder="Savol matni..." rows={2} />
                                    <div className="grid grid-cols-2 gap-2">
                                        {q.options.map((opt, oi) => (
                                            <Input key={oi} dir="rtl" value={opt} onChange={(e) => {
                                                const opts = [...q.options]; opts[oi] = e.target.value;
                                                updateQ(qi, "options", opts);
                                            }} placeholder={`Variant ${String.fromCharCode(65 + oi)}`}
                                                className={oi === q.correctIndex ? "border-emerald-500 ring-1 ring-emerald-200" : ""}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => setEditing(null)} className="gap-2 rounded-xl"><X className="h-4 w-4" /> Bekor</Button>
                        <Button onClick={save} disabled={saving} className="gap-2 rounded-xl"><Save className="h-4 w-4" /> {saving ? "Saqlanmoqda..." : "Saqlash"}</Button>
                    </div>
                </div>
            )}

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
            ) : (
                <div className="space-y-3">
                    {data?.items.map((p) => (
                        <div key={p.id} className="rounded-xl border border-border bg-card overflow-hidden">
                            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpandedId((prev) => prev === p.id ? null : p.id)}>
                                <div className="flex items-center gap-3">
                                    <BookOpen className="h-5 w-5 text-teal-500" />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${DIFF_BADGE[p.difficulty]}`}>{DIFF_LABEL[p.difficulty]}</span>
                                            <span className="text-xs text-muted-foreground">{TYPE_LABEL[p.passageType]}</span>
                                        </div>
                                        <p className="text-sm mt-1 line-clamp-1" dir="rtl">{p.text.slice(0, 100)}...</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs text-muted-foreground">{p.questions.length} savol</span>
                                    {expandedId === p.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(p); }} className="h-8 w-8 p-0"><Pencil className="h-3.5 w-3.5" /></Button>
                                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); remove(p.id); }} className="h-8 w-8 p-0 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                            </div>
                            {expandedId === p.id && (
                                <div className="border-t border-border p-4 bg-muted/10 space-y-2">
                                    <p dir="rtl" className="text-sm leading-relaxed">{p.text}</p>
                                    <div className="text-xs text-muted-foreground">O'qish: {p.readingTimeSeconds}s | Javob: {p.questionTimeSeconds}s</div>
                                    <div className="space-y-1 mt-3">
                                        {p.questions.map((q, i) => {
                                            const opts: string[] = JSON.parse(q.options);
                                            return (
                                                <div key={q.id} className="text-sm pl-4 border-l-2 border-primary/20 py-1">
                                                    <span className="text-muted-foreground">{i + 1}.</span>{" "}
                                                    <span dir="rtl">{q.prompt}</span>
                                                    <span className="text-emerald-600 ml-2 text-xs">({opts[q.correctIndex]})</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {data?.items.length === 0 && <p className="text-center text-muted-foreground py-8">Hali passage yo'q</p>}
                </div>
            )}

            {/* Pagination */}
            {data && data.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg"><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm text-muted-foreground">{page} / {data.totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg"><ChevronRight className="h-4 w-4" /></Button>
                </div>
            )}
        </div>
    );
}
