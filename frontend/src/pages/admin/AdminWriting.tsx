import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/PageHeader";
import { api } from "@/lib/api";
import { Loader2, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, PenTool, X } from "lucide-react";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

type RubricCriteria = { criteriaName: string; maxPoints: number; description: string };

type WritingTaskItem = {
    id: string;
    level: string;
    prompt: string;
    wordLimitMin: number;
    wordLimitMax: number;
    rubric: string; // JSON
    createdAt: string;
};

type ListResponse = { items: WritingTaskItem[]; total: number; page: number; pageSize: number; totalPages: number };

const defaultCriteria: RubricCriteria[] = [
    { criteriaName: "المحتوى والأفكار", maxPoints: 5, description: "مدى ملاءمة الأفكار وتطويرها" },
    { criteriaName: "التنظيم والتماسك", maxPoints: 5, description: "التسلسل المنطقي وأدوات الربط" },
    { criteriaName: "المفردات", maxPoints: 5, description: "دقة المفردات وتنوعها" },
    { criteriaName: "القواعد", maxPoints: 5, description: "صحة القواعد النحوية والصرفية" },
    { criteriaName: "الإملاء والخط", maxPoints: 5, description: "الدقة الإملائية ووضوح الكتابة" },
];

const emptyForm = {
    level: "A1",
    prompt: "",
    wordLimitMin: 100,
    wordLimitMax: 200,
    rubric: [...defaultCriteria],
};

export function AdminWriting() {
    const qc = useQueryClient();
    const [page, setPage] = useState(1);
    const [levelFilter, setLevelFilter] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const params = new URLSearchParams();
    if (levelFilter) params.set("level", levelFilter);
    params.set("page", String(page));
    params.set("pageSize", "20");

    const { data, isLoading } = useQuery({
        queryKey: ["admin-writing", levelFilter, page],
        queryFn: () => api<ListResponse>(`/admin/writing?${params}`),
    });

    const createMut = useMutation({
        mutationFn: (body: Record<string, unknown>) => api("/admin/writing", { method: "POST", body }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-writing"] }); closeModal(); },
    });

    const updateMut = useMutation({
        mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
            api(`/admin/writing/${id}`, { method: "PUT", body }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-writing"] }); closeModal(); },
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => api(`/admin/writing/${id}`, { method: "DELETE" }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-writing"] }); setDeleteConfirm(null); },
    });

    const closeModal = () => { setModalOpen(false); setForm(emptyForm); setEditingId(null); };

    const openCreate = useCallback(() => {
        setForm({ ...emptyForm, rubric: [...defaultCriteria] });
        setEditingId(null);
        setModalOpen(true);
    }, []);

    const openEdit = useCallback((item: WritingTaskItem) => {
        let rubric: RubricCriteria[] = [];
        try { rubric = JSON.parse(item.rubric); } catch { rubric = [...defaultCriteria]; }
        setForm({
            level: item.level,
            prompt: item.prompt,
            wordLimitMin: item.wordLimitMin,
            wordLimitMax: item.wordLimitMax,
            rubric,
        });
        setEditingId(item.id);
        setModalOpen(true);
    }, []);

    const updateCriteria = (idx: number, field: keyof RubricCriteria, value: string | number) => {
        setForm(f => {
            const r = [...f.rubric];
            r[idx] = { ...r[idx], [field]: value };
            return { ...f, rubric: r };
        });
    };

    const addCriteria = () => {
        setForm(f => ({
            ...f,
            rubric: [...f.rubric, { criteriaName: "", maxPoints: 5, description: "" }],
        }));
    };

    const removeCriteria = (idx: number) => {
        setForm(f => ({
            ...f,
            rubric: f.rubric.filter((_, i) => i !== idx),
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const body = {
            level: form.level,
            prompt: form.prompt,
            wordLimitMin: form.wordLimitMin,
            wordLimitMax: form.wordLimitMax,
            rubric: form.rubric,
        };
        if (editingId) updateMut.mutate({ id: editingId, body });
        else createMut.mutate(body);
    };

    const items = data?.items ?? [];
    const totalPages = data?.totalPages ?? 0;

    const parseRubric = (r: string): RubricCriteria[] => {
        try { return JSON.parse(r); } catch { return []; }
    };

    return (
        <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <PageHeader
                title="Yozish bo'limi (Writing)"
                subtitle="Yozma topshiriqlar va baholash mezonlari (rubric). Har bir topshiriqda so'z chegarasi va batafsil rubric."
                action={<Button className="rounded-xl gap-2" onClick={openCreate}><Plus className="h-4 w-4" />Yangi topshiriq</Button>}
            />

            <Card className="rounded-xl border-border shadow-sm overflow-hidden">
                <CardHeader className="pb-2">
                    <div className="flex flex-wrap gap-3 items-center">
                        <CardTitle className="text-base">Writing Tasks</CardTitle>
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
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/50">
                                            <th className="text-left p-3 font-medium w-16">Daraja</th>
                                            <th className="text-left p-3 font-medium">Topshiriq</th>
                                            <th className="text-left p-3 font-medium w-28">So'z chegarasi</th>
                                            <th className="text-left p-3 font-medium w-20">Mezonlar</th>
                                            <th className="text-left p-3 w-24">Amallar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.length === 0 ? (
                                            <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Topshiriqlar topilmadi</td></tr>
                                        ) : items.map(t => {
                                            const rubric = parseRubric(t.rubric);
                                            return (
                                                <tr key={t.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                                    <td className="p-3">
                                                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 text-xs font-bold">{t.level}</span>
                                                    </td>
                                                    <td className="p-3 max-w-[300px]" dir="rtl">
                                                        <div className="flex items-center gap-2">
                                                            <PenTool className="h-4 w-4 text-amber-500 shrink-0" />
                                                            <span className="truncate">{t.prompt.slice(0, 80)}{t.prompt.length > 80 ? "…" : ""}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-muted-foreground">{t.wordLimitMin}–{t.wordLimitMax}</td>
                                                    <td className="p-3 text-muted-foreground">{rubric.length} ta</td>
                                                    <td className="p-3">
                                                        <div className="flex gap-1">
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(t)}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            {deleteConfirm === t.id ? (
                                                                <>
                                                                    <Button variant="destructive" size="sm" className="h-8 text-xs"
                                                                        onClick={() => deleteMut.mutate(t.id)} disabled={deleteMut.isPending}>Ha</Button>
                                                                    <Button variant="outline" size="sm" className="h-8 text-xs"
                                                                        onClick={() => setDeleteConfirm(null)}>Yo'q</Button>
                                                                </>
                                                            ) : (
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive"
                                                                    onClick={() => setDeleteConfirm(t.id)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
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
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">CEFR</label>
                                        <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" required>
                                            {CEFR_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Min so'z</label>
                                        <input type="number" value={form.wordLimitMin}
                                            onChange={e => setForm(f => ({ ...f, wordLimitMin: Number(e.target.value) }))}
                                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" min={1} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Maks so'z</label>
                                        <input type="number" value={form.wordLimitMax}
                                            onChange={e => setForm(f => ({ ...f, wordLimitMax: Number(e.target.value) }))}
                                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" min={1} required />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Topshiriq matni (arabcha)</label>
                                    <textarea value={form.prompt} onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
                                        className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        dir="rtl" placeholder="اكتب مقالاً عن..." required />
                                </div>

                                {/* Rubric editor */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-semibold">Baholash mezonlari (Rubric)</h3>
                                        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addCriteria}>
                                            <Plus className="h-3 w-3" /> Mezon qo'shish
                                        </Button>
                                    </div>
                                    <div className="space-y-3">
                                        {form.rubric.map((c, ci) => (
                                            <div key={ci} className="p-3 rounded-xl border border-border bg-muted/30 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-muted-foreground w-6">{ci + 1}</span>
                                                    <input type="text" value={c.criteriaName}
                                                        onChange={e => updateCriteria(ci, "criteriaName", e.target.value)}
                                                        className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                                                        dir="rtl" placeholder="Mezon nomi" required />
                                                    <input type="number" value={c.maxPoints}
                                                        onChange={e => updateCriteria(ci, "maxPoints", Number(e.target.value))}
                                                        className="h-9 w-20 rounded-md border border-input bg-background px-2 text-sm text-center"
                                                        min={1} max={25} required />
                                                    <span className="text-xs text-muted-foreground">ball</span>
                                                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive"
                                                        onClick={() => removeCriteria(ci)}><X className="h-3 w-3" /></Button>
                                                </div>
                                                <input type="text" value={c.description}
                                                    onChange={e => updateCriteria(ci, "description", e.target.value)}
                                                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                                                    dir="rtl" placeholder="Tavsif..." />
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Jami ball: {form.rubric.reduce((s, c) => s + c.maxPoints, 0)}
                                    </p>
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
