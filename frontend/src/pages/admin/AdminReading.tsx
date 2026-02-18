import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/PageHeader";
import { api } from "@/lib/api";
import { Loader2, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, BookOpen, ChevronDown, ChevronUp } from "lucide-react";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const PASSAGE_TYPES = [
    { value: "short", label: "Qisqa (80–100 so'z)", readingTime: 120, questionTime: 360, questionCount: 6 },
    { value: "medium", label: "O'rta (150–180 so'z)", readingTime: 180, questionTime: 480, questionCount: 8 },
    { value: "long", label: "Uzun (250–300 so'z)", readingTime: 300, questionTime: 1200, questionCount: 10 },
] as const;

type ReadingQuestionItem = {
    id: string;
    prompt: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctIndex: number;
    orderIndex: number;
};

type ReadingPassageItem = {
    id: string;
    level: string;
    passageType: string;
    text: string;
    readingTimeSeconds: number;
    questionTimeSeconds: number;
    questions: ReadingQuestionItem[];
    createdAt: string;
};

type QuestionForm = { prompt: string; optionA: string; optionB: string; optionC: string; optionD: string; correctIndex: number };
const emptyQuestion: QuestionForm = { prompt: "", optionA: "", optionB: "", optionC: "", optionD: "", correctIndex: 0 };

const emptyForm = {
    level: "A1",
    passageType: "short" as string,
    text: "",
    readingTimeSeconds: 120,
    questionTimeSeconds: 360,
    questions: [] as QuestionForm[],
};

type ListResponse = { items: ReadingPassageItem[]; total: number; page: number; pageSize: number; totalPages: number };

export function AdminReading() {
    const qc = useQueryClient();
    const [page, setPage] = useState(1);
    const [levelFilter, setLevelFilter] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);

    const params = new URLSearchParams();
    if (levelFilter) params.set("level", levelFilter);
    params.set("page", String(page));
    params.set("pageSize", "20");

    const { data, isLoading } = useQuery({
        queryKey: ["admin-reading", levelFilter, page],
        queryFn: () => api<ListResponse>(`/admin/reading?${params}`),
    });

    const createMut = useMutation({
        mutationFn: (body: Record<string, unknown>) => api("/admin/reading", { method: "POST", body }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reading"] }); close(); },
    });

    const updateMut = useMutation({
        mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
            api(`/admin/reading/${id}`, { method: "PUT", body }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reading"] }); close(); },
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => api(`/admin/reading/${id}`, { method: "DELETE" }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reading"] }); setDeleteConfirm(null); },
    });

    const close = () => { setModalOpen(false); setForm(emptyForm); setEditingId(null); };

    const openCreate = useCallback(() => {
        const pt = PASSAGE_TYPES[0];
        setForm({
            ...emptyForm,
            questions: Array.from({ length: pt.questionCount }, () => ({ ...emptyQuestion })),
        });
        setEditingId(null);
        setModalOpen(true);
    }, []);

    const openEdit = useCallback((item: ReadingPassageItem) => {
        setForm({
            level: item.level,
            passageType: item.passageType,
            text: item.text,
            readingTimeSeconds: item.readingTimeSeconds,
            questionTimeSeconds: item.questionTimeSeconds,
            questions: item.questions.map(q => ({
                prompt: q.prompt, optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD, correctIndex: q.correctIndex,
            })),
        });
        setEditingId(item.id);
        setModalOpen(true);
    }, []);

    const handlePassageTypeChange = (type: string) => {
        const pt = PASSAGE_TYPES.find(p => p.value === type)!;
        setForm(f => ({
            ...f,
            passageType: type,
            readingTimeSeconds: pt.readingTime,
            questionTimeSeconds: pt.questionTime,
            questions: Array.from({ length: pt.questionCount }, (_, i) => f.questions[i] ?? { ...emptyQuestion }),
        }));
    };

    const updateQuestion = (idx: number, field: keyof QuestionForm, value: string | number) => {
        setForm(f => {
            const qs = [...f.questions];
            qs[idx] = { ...qs[idx], [field]: value };
            return { ...f, questions: qs };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const body = {
            level: form.level, passageType: form.passageType, text: form.text,
            readingTimeSeconds: form.readingTimeSeconds, questionTimeSeconds: form.questionTimeSeconds,
            questions: form.questions.map(q => ({ ...q, correctIndex: Number(q.correctIndex) })),
        };
        if (editingId) updateMut.mutate({ id: editingId, body });
        else createMut.mutate(body);
    };

    const items = data?.items ?? [];
    const totalPages = data?.totalPages ?? 0;
    const optionLabels = ["A", "B", "C", "D"];
    const passageTypeLabel = (t: string) => PASSAGE_TYPES.find(p => p.value === t)?.label ?? t;

    return (
        <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <PageHeader
                title="O'qish bo'limi (Reading)"
                subtitle="Matn (passage) + savollar. Qisqa/o'rta/uzun matnlar avtomatik vaqt sozlamalari bilan."
                action={<Button className="rounded-xl gap-2" onClick={openCreate}><Plus className="h-4 w-4" />Yangi passage</Button>}
            />

            <Card className="rounded-xl border-border shadow-sm overflow-hidden">
                <CardHeader className="pb-2">
                    <div className="flex flex-wrap gap-3 items-center">
                        <CardTitle className="text-base">Reading Passages</CardTitle>
                        <select value={levelFilter} onChange={e => { setLevelFilter(e.target.value); setPage(1); }}
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                            <option value="">Barcha darajalar</option>
                            {CEFR_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <span className="text-sm text-muted-foreground ml-auto">Jami: {data?.total ?? 0}</span>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin" /><span>Yuklanmoqda…</span>
                        </div>
                    ) : (
                        <>
                            <div className="divide-y divide-border">
                                {items.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground">Passage topilmadi</div>
                                ) : items.map(p => (
                                    <div key={p.id} className="hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded(e => e === p.id ? null : p.id)}>
                                            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold">{p.level}</span>
                                            <span className="text-xs text-muted-foreground">{passageTypeLabel(p.passageType)}</span>
                                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                                            <span className="flex-1 text-sm truncate" dir="rtl">{p.text.slice(0, 100)}…</span>
                                            <span className="text-xs text-muted-foreground">{p.questions.length} savol</span>
                                            {expanded === p.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={e => { e.stopPropagation(); openEdit(p); }}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            {deleteConfirm === p.id ? (
                                                <>
                                                    <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={e => { e.stopPropagation(); deleteMut.mutate(p.id); }}>Ha</Button>
                                                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={e => { e.stopPropagation(); setDeleteConfirm(null); }}>Yo'q</Button>
                                                </>
                                            ) : (
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={e => { e.stopPropagation(); setDeleteConfirm(p.id); }}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                        {expanded === p.id && (
                                            <div className="px-4 pb-4 space-y-2">
                                                <div className="p-3 rounded-lg bg-muted/50 text-sm" dir="rtl">{p.text}</div>
                                                <div className="text-xs text-muted-foreground">O'qish: {p.readingTimeSeconds}s · Savollar: {p.questionTimeSeconds}s</div>
                                                <div className="space-y-1">
                                                    {p.questions.map((q, i) => (
                                                        <div key={q.id} className="flex gap-2 items-start text-sm p-2 rounded bg-background border border-border">
                                                            <span className="font-bold text-muted-foreground w-6 shrink-0">{i + 1}.</span>
                                                            <div className="flex-1" dir="rtl">
                                                                <p className="font-medium">{q.prompt}</p>
                                                                <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                                                                    {[q.optionA, q.optionB, q.optionC, q.optionD].map((o, oi) => (
                                                                        <span key={oi} className={oi === q.correctIndex ? "text-primary font-bold" : ""}>
                                                                            {optionLabels[oi]}) {o}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between p-3 border-t">
                                    <p className="text-sm text-muted-foreground">Sahifa {page} / {totalPages}</p>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/50 overflow-y-auto"
                    onClick={() => !createMut.isPending && !updateMut.isPending && close()}>
                    <Card className="w-full max-w-3xl rounded-xl shadow-lg mb-8" onClick={e => e.stopPropagation()}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle>{editingId ? "Passage tahrirlash" : "Yangi passage"}</CardTitle>
                            <Button variant="ghost" size="sm" onClick={close}>✕</Button>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">CEFR darajasi</label>
                                        <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" required>
                                            {CEFR_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Passage turi</label>
                                        <select value={form.passageType} onChange={e => handlePassageTypeChange(e.target.value)}
                                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                            {PASSAGE_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium mb-1">O'qish (s)</label>
                                            <input type="number" value={form.readingTimeSeconds}
                                                onChange={e => setForm(f => ({ ...f, readingTimeSeconds: Number(e.target.value) }))}
                                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium mb-1">Javob (s)</label>
                                            <input type="number" value={form.questionTimeSeconds}
                                                onChange={e => setForm(f => ({ ...f, questionTimeSeconds: Number(e.target.value) }))}
                                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Matn (arabcha)</label>
                                    <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                                        className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        dir="rtl" placeholder="نص القراءة..." required />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-semibold">Savollar ({form.questions.length} ta)</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {form.questions.map((q, qi) => (
                                            <div key={qi} className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-muted-foreground">Savol {qi + 1}</span>
                                                </div>
                                                <textarea value={q.prompt} onChange={e => updateQuestion(qi, "prompt", e.target.value)}
                                                    className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                    dir="rtl" placeholder="Savol matni..." required />
                                                <div className="grid grid-cols-2 gap-2">
                                                    {(["optionA", "optionB", "optionC", "optionD"] as const).map((key, oi) => (
                                                        <div key={key} className="flex items-center gap-2">
                                                            <span className={`text-xs font-bold w-5 ${q.correctIndex === oi ? 'text-primary' : 'text-muted-foreground'}`}>{optionLabels[oi]}</span>
                                                            <input type="text" value={q[key]}
                                                                onChange={e => updateQuestion(qi, key, e.target.value)}
                                                                className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                                                                dir="rtl" required />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div>
                                                    <label className="text-xs text-muted-foreground">To'g'ri javob:</label>
                                                    <select value={q.correctIndex} onChange={e => updateQuestion(qi, "correctIndex", Number(e.target.value))}
                                                        className="h-8 ml-2 rounded border border-input bg-background px-2 text-xs">
                                                        {optionLabels.map((l, i) => <option key={i} value={i}>{l}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button type="submit" className="rounded-xl gap-2" disabled={createMut.isPending || updateMut.isPending}>
                                        {(createMut.isPending || updateMut.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                                        {editingId ? "Saqlash" : "Qo'shish"}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={close}>Bekor qilish</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </motion.div>
    );
}
