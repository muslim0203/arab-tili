import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/PageHeader";
import { api } from "@/lib/api";
import {
    Loader2, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Mic, X,
    ChevronDown, ChevronUp,
} from "lucide-react";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

type Part2Topic = { topic: string; bulletPoints: string[] };
type Part3Item = { prompt: string; followUp: string };

type SpeakingTaskItem = {
    id: string;
    level: string;
    part1Questions: string; // JSON
    part2Topics: string;    // JSON
    part3Discussion: string; // JSON
    rubric: string;          // JSON
    createdAt: string;
};

type ListResponse = { items: SpeakingTaskItem[]; total: number; page: number; pageSize: number; totalPages: number };

const defaultPart2: Part2Topic[] = [
    { topic: "", bulletPoints: ["", ""] },
];

const defaultPart3: Part3Item[] = [
    { prompt: "", followUp: "" },
];

const emptyForm = {
    level: "A1",
    part1Questions: ["", "", ""],
    part2Topics: [...defaultPart2.map(t => ({ ...t, bulletPoints: [...t.bulletPoints] }))],
    part3Discussion: [...defaultPart3.map(d => ({ ...d }))],
    rubricText: JSON.stringify([
        { criteriaName: "النطق والطلاقة", maxPoints: 5, description: "وضوح النطق وسلاسة التحدث" },
        { criteriaName: "المفردات", maxPoints: 5, description: "تنوع ودقة المفردات المستخدمة" },
        { criteriaName: "القواعد", maxPoints: 5, description: "صحة التراكيب النحوية" },
        { criteriaName: "التفاعل", maxPoints: 5, description: "القدرة على التفاعل والاستجابة" },
        { criteriaName: "المحتوى", maxPoints: 5, description: "عمق وملاءمة الأفكار" },
    ], null, 2),
};

export function AdminSpeaking() {
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
        queryKey: ["admin-speaking", levelFilter, page],
        queryFn: () => api<ListResponse>(`/admin/speaking?${params}`),
    });

    const createMut = useMutation({
        mutationFn: (body: Record<string, unknown>) => api("/admin/speaking", { method: "POST", body }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-speaking"] }); closeModal(); },
    });

    const updateMut = useMutation({
        mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
            api(`/admin/speaking/${id}`, { method: "PUT", body }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-speaking"] }); closeModal(); },
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => api(`/admin/speaking/${id}`, { method: "DELETE" }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-speaking"] }); setDeleteConfirm(null); },
    });

    const closeModal = () => { setModalOpen(false); setForm(emptyForm); setEditingId(null); };

    const openCreate = useCallback(() => {
        setForm({
            ...emptyForm,
            part1Questions: ["", "", ""],
            part2Topics: [{ topic: "", bulletPoints: ["", ""] }],
            part3Discussion: [{ prompt: "", followUp: "" }],
        });
        setEditingId(null);
        setModalOpen(true);
    }, []);

    const openEdit = useCallback((item: SpeakingTaskItem) => {
        let p1: string[] = [];
        let p2: Part2Topic[] = [];
        let p3: Part3Item[] = [];
        let rubricText = "";
        try { p1 = JSON.parse(item.part1Questions); } catch { p1 = ["", "", ""]; }
        try { p2 = JSON.parse(item.part2Topics); } catch { p2 = [{ topic: "", bulletPoints: ["", ""] }]; }
        try { p3 = JSON.parse(item.part3Discussion); } catch { p3 = [{ prompt: "", followUp: "" }]; }
        try { rubricText = JSON.stringify(JSON.parse(item.rubric), null, 2); } catch { rubricText = item.rubric; }

        setForm({ level: item.level, part1Questions: p1, part2Topics: p2, part3Discussion: p3, rubricText });
        setEditingId(item.id);
        setModalOpen(true);
    }, []);

    // Part 1 helpers
    const updateP1 = (idx: number, val: string) => {
        setForm(f => { const qs = [...f.part1Questions]; qs[idx] = val; return { ...f, part1Questions: qs }; });
    };
    const addP1 = () => setForm(f => ({ ...f, part1Questions: [...f.part1Questions, ""] }));
    const removeP1 = (idx: number) => setForm(f => ({ ...f, part1Questions: f.part1Questions.filter((_, i) => i !== idx) }));

    // Part 2 helpers
    const updateP2Topic = (idx: number, val: string) => {
        setForm(f => { const ts = [...f.part2Topics]; ts[idx] = { ...ts[idx], topic: val }; return { ...f, part2Topics: ts }; });
    };
    const updateP2Bullet = (tidx: number, bidx: number, val: string) => {
        setForm(f => {
            const ts = [...f.part2Topics];
            const bps = [...ts[tidx].bulletPoints];
            bps[bidx] = val;
            ts[tidx] = { ...ts[tidx], bulletPoints: bps };
            return { ...f, part2Topics: ts };
        });
    };
    const addP2Bullet = (tidx: number) => {
        setForm(f => {
            const ts = [...f.part2Topics];
            ts[tidx] = { ...ts[tidx], bulletPoints: [...ts[tidx].bulletPoints, ""] };
            return { ...f, part2Topics: ts };
        });
    };
    const removeP2Bullet = (tidx: number, bidx: number) => {
        setForm(f => {
            const ts = [...f.part2Topics];
            ts[tidx] = { ...ts[tidx], bulletPoints: ts[tidx].bulletPoints.filter((_, i) => i !== bidx) };
            return { ...f, part2Topics: ts };
        });
    };
    const addP2Topic = () => setForm(f => ({ ...f, part2Topics: [...f.part2Topics, { topic: "", bulletPoints: ["", ""] }] }));
    const removeP2Topic = (idx: number) => setForm(f => ({ ...f, part2Topics: f.part2Topics.filter((_, i) => i !== idx) }));

    // Part 3 helpers
    const updateP3 = (idx: number, field: keyof Part3Item, val: string) => {
        setForm(f => { const ds = [...f.part3Discussion]; ds[idx] = { ...ds[idx], [field]: val }; return { ...f, part3Discussion: ds }; });
    };
    const addP3 = () => setForm(f => ({ ...f, part3Discussion: [...f.part3Discussion, { prompt: "", followUp: "" }] }));
    const removeP3 = (idx: number) => setForm(f => ({ ...f, part3Discussion: f.part3Discussion.filter((_, i) => i !== idx) }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        let rubric;
        try { rubric = JSON.parse(form.rubricText); } catch { rubric = form.rubricText; }
        const body = {
            level: form.level,
            part1Questions: form.part1Questions.filter(Boolean),
            part2Topics: form.part2Topics.filter(t => t.topic),
            part3Discussion: form.part3Discussion.filter(d => d.prompt),
            rubric,
        };
        if (editingId) updateMut.mutate({ id: editingId, body });
        else createMut.mutate(body);
    };

    const items = data?.items ?? [];
    const totalPages = data?.totalPages ?? 0;

    const safe = (s: string, fallback: unknown[] = []) => { try { return JSON.parse(s); } catch { return fallback; } };

    return (
        <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <PageHeader
                title="Gapirish bo'limi (Speaking)"
                subtitle="3 qismli gapirish topshiriqlari: Part 1 (savollar), Part 2 (mavzular+nuqtalar), Part 3 (munozara)."
                action={<Button className="rounded-xl gap-2" onClick={openCreate}><Plus className="h-4 w-4" />Yangi topshiriq</Button>}
            />

            <Card className="rounded-xl border-border shadow-sm overflow-hidden">
                <CardHeader className="pb-2">
                    <div className="flex flex-wrap gap-3 items-center">
                        <CardTitle className="text-base">Speaking Tasks</CardTitle>
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
                                    <div className="p-8 text-center text-muted-foreground">Topshiriqlar topilmadi</div>
                                ) : items.map(t => {
                                    const p1 = safe(t.part1Questions) as string[];
                                    const p2 = safe(t.part2Topics) as Part2Topic[];
                                    const p3 = safe(t.part3Discussion) as Part3Item[];
                                    return (
                                        <div key={t.id} className="hover:bg-muted/30 transition-colors">
                                            <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded(e => e === t.id ? null : t.id)}>
                                                <span className="px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-600 text-xs font-bold">{t.level}</span>
                                                <Mic className="h-4 w-4 text-violet-500" />
                                                <span className="flex-1 text-sm">
                                                    Part1: {p1.length} savol · Part2: {p2.length} mavzu · Part3: {p3.length} munozara
                                                </span>
                                                {expanded === t.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={e => { e.stopPropagation(); openEdit(t); }}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                {deleteConfirm === t.id ? (
                                                    <>
                                                        <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={e => { e.stopPropagation(); deleteMut.mutate(t.id); }}>Ha</Button>
                                                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={e => { e.stopPropagation(); setDeleteConfirm(null); }}>Yo'q</Button>
                                                    </>
                                                ) : (
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={e => { e.stopPropagation(); setDeleteConfirm(t.id); }}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                            {expanded === t.id && (
                                                <div className="px-4 pb-4 space-y-4">
                                                    {/* Part 1 */}
                                                    <div className="space-y-1">
                                                        <h4 className="text-xs font-semibold text-violet-600">الجزء الأول – Savollar</h4>
                                                        {p1.map((q, i) => (
                                                            <p key={i} className="text-sm p-2 rounded bg-background border border-border" dir="rtl">{i + 1}. {q}</p>
                                                        ))}
                                                    </div>
                                                    {/* Part 2 */}
                                                    <div className="space-y-1">
                                                        <h4 className="text-xs font-semibold text-violet-600">الجزء الثاني – Mavzular</h4>
                                                        {p2.map((topic, i) => (
                                                            <div key={i} className="text-sm p-2 rounded bg-background border border-border" dir="rtl">
                                                                <p className="font-medium">{topic.topic}</p>
                                                                <ul className="list-disc list-inside mt-1 text-muted-foreground">
                                                                    {topic.bulletPoints.map((bp, bi) => <li key={bi}>{bp}</li>)}
                                                                </ul>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {/* Part 3 */}
                                                    <div className="space-y-1">
                                                        <h4 className="text-xs font-semibold text-violet-600">الجزء الثالث – Munozara</h4>
                                                        {p3.map((d, i) => (
                                                            <div key={i} className="text-sm p-2 rounded bg-background border border-border" dir="rtl">
                                                                <p className="font-medium">{d.prompt}</p>
                                                                {d.followUp && <p className="text-xs text-muted-foreground mt-1">↳ {d.followUp}</p>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
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
                    onClick={() => !createMut.isPending && !updateMut.isPending && closeModal()}>
                    <Card className="w-full max-w-3xl rounded-xl shadow-lg mb-8" onClick={e => e.stopPropagation()}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle>{editingId ? "Topshiriqni tahrirlash" : "Yangi topshiriq"}</CardTitle>
                            <Button variant="ghost" size="sm" onClick={closeModal}>✕</Button>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium mb-1">CEFR darajasi</label>
                                    <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                                        className="h-10 w-full max-w-[200px] rounded-md border border-input bg-background px-3 text-sm" required>
                                        {CEFR_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>

                                {/* Part 1: Questions */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-violet-600">الجزء الأول – Kirish savollari</h3>
                                        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addP1}>
                                            <Plus className="h-3 w-3" /> Savol
                                        </Button>
                                    </div>
                                    {form.part1Questions.map((q, i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
                                            <input type="text" value={q} onChange={e => updateP1(i, e.target.value)}
                                                className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                                                dir="rtl" placeholder="ما هو موضوع...?" />
                                            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive"
                                                onClick={() => removeP1(i)} disabled={form.part1Questions.length <= 1}><X className="h-3 w-3" /></Button>
                                        </div>
                                    ))}
                                </div>

                                {/* Part 2: Topics */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-violet-600">الجزء الثاني – Mavzu + nuqtalar</h3>
                                        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addP2Topic}>
                                            <Plus className="h-3 w-3" /> Mavzu
                                        </Button>
                                    </div>
                                    {form.part2Topics.map((topic, ti) => (
                                        <div key={ti} className="p-3 rounded-xl border border-border bg-muted/30 space-y-2">
                                            <div className="flex gap-2 items-center">
                                                <input type="text" value={topic.topic} onChange={e => updateP2Topic(ti, e.target.value)}
                                                    className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                                                    dir="rtl" placeholder="Mavzu nomi (arabcha)" />
                                                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive"
                                                    onClick={() => removeP2Topic(ti)} disabled={form.part2Topics.length <= 1}><X className="h-3 w-3" /></Button>
                                            </div>
                                            <div className="space-y-1 pl-4">
                                                {topic.bulletPoints.map((bp, bi) => (
                                                    <div key={bi} className="flex gap-2 items-center">
                                                        <span className="text-xs text-muted-foreground">•</span>
                                                        <input type="text" value={bp} onChange={e => updateP2Bullet(ti, bi, e.target.value)}
                                                            className="h-8 flex-1 rounded border border-input bg-background px-2 text-xs"
                                                            dir="rtl" placeholder="Nuqta..." />
                                                        <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"
                                                            onClick={() => removeP2Bullet(ti, bi)} disabled={topic.bulletPoints.length <= 1}><X className="h-2 w-2" /></Button>
                                                    </div>
                                                ))}
                                                <Button type="button" variant="ghost" size="sm" className="text-xs gap-1" onClick={() => addP2Bullet(ti)}>
                                                    <Plus className="h-2 w-2" /> Nuqta
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Part 3: Discussion */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-violet-600">الجزء الثالث – Munozara</h3>
                                        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addP3}>
                                            <Plus className="h-3 w-3" /> Savol
                                        </Button>
                                    </div>
                                    {form.part3Discussion.map((d, di) => (
                                        <div key={di} className="p-3 rounded-xl border border-border bg-muted/30 space-y-2">
                                            <div className="flex gap-2 items-center">
                                                <span className="text-xs text-muted-foreground w-5">{di + 1}</span>
                                                <input type="text" value={d.prompt} onChange={e => updateP3(di, "prompt", e.target.value)}
                                                    className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                                                    dir="rtl" placeholder="Asosiy savol" />
                                                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive"
                                                    onClick={() => removeP3(di)} disabled={form.part3Discussion.length <= 1}><X className="h-3 w-3" /></Button>
                                            </div>
                                            <input type="text" value={d.followUp} onChange={e => updateP3(di, "followUp", e.target.value)}
                                                className="h-8 w-full rounded border border-input bg-background px-2 text-xs"
                                                dir="rtl" placeholder="Follow-up savol (ixtiyoriy)" />
                                        </div>
                                    ))}
                                </div>

                                {/* Rubric JSON */}
                                <div>
                                    <label className="block text-sm font-medium mb-1">Rubric (JSON)</label>
                                    <textarea value={form.rubricText} onChange={e => setForm(f => ({ ...f, rubricText: e.target.value }))}
                                        className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                                        placeholder='[{"criteriaName":"...", "maxPoints":5, "description":"..."}]' required />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button type="submit" className="rounded-xl gap-2" disabled={createMut.isPending || updateMut.isPending}>
                                        {(createMut.isPending || updateMut.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                                        {editingId ? "Saqlash" : "Qo'shish"}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={closeModal}>Bekor qilish</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </motion.div>
    );
}
