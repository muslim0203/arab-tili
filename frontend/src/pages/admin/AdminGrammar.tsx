import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/PageHeader";
import { api } from "@/lib/api";
import {
    Loader2, ChevronLeft, ChevronRight, Plus, Pencil, Trash2,
} from "lucide-react";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

type GrammarItem = {
    id: string;
    level: string;
    prompt: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctIndex: number;
    tags: string | null;
    createdAt: string;
};

type ListResponse = { items: GrammarItem[]; total: number; page: number; pageSize: number; totalPages: number };

const emptyForm = {
    level: "A1",
    prompt: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctIndex: 0,
    tags: "",
};

export function AdminGrammar() {
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
        queryKey: ["admin-grammar", levelFilter, page],
        queryFn: () => api<ListResponse>(`/admin/grammar?${params}`),
    });

    const createMut = useMutation({
        mutationFn: (body: Record<string, unknown>) => api("/admin/grammar", { method: "POST", body }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-grammar"] }); setModalOpen(false); setForm(emptyForm); setEditingId(null); },
    });

    const updateMut = useMutation({
        mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
            api(`/admin/grammar/${id}`, { method: "PUT", body }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-grammar"] }); setModalOpen(false); setForm(emptyForm); setEditingId(null); },
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => api(`/admin/grammar/${id}`, { method: "DELETE" }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-grammar"] }); setDeleteConfirm(null); },
    });

    const openCreate = useCallback(() => { setForm(emptyForm); setEditingId(null); setModalOpen(true); }, []);

    const openEdit = useCallback((item: GrammarItem) => {
        let tags = "";
        try { tags = item.tags ? JSON.parse(item.tags).join(", ") : ""; } catch { tags = item.tags ?? ""; }
        setForm({
            level: item.level, prompt: item.prompt,
            optionA: item.optionA, optionB: item.optionB, optionC: item.optionC, optionD: item.optionD,
            correctIndex: item.correctIndex, tags,
        });
        setEditingId(item.id);
        setModalOpen(true);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const tags = form.tags ? form.tags.split(",").map(s => s.trim()).filter(Boolean) : [];
        const body = { ...form, correctIndex: Number(form.correctIndex), tags };
        if (editingId) updateMut.mutate({ id: editingId, body });
        else createMut.mutate(body);
    };

    const items = data?.items ?? [];
    const totalPages = data?.totalPages ?? 0;
    const optionLabels = ["A", "B", "C", "D"] as const;

    return (
        <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <PageHeader
                title="Grammatika savollari"
                subtitle="Grammatika bo'limi uchun MCQ savollari. Har bir savol 4 ta variant (A-D) va to'g'ri javob."
                action={<Button className="rounded-xl gap-2" onClick={openCreate}><Plus className="h-4 w-4" />Yangi savol</Button>}
            />

            <Card className="rounded-xl border-border shadow-sm overflow-hidden">
                <CardHeader className="pb-2">
                    <div className="flex flex-wrap gap-3 items-center">
                        <CardTitle className="text-base">Savollar</CardTitle>
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
                                            <th className="text-left p-3 font-medium">Savol</th>
                                            <th className="text-left p-3 font-medium w-20">To'g'ri</th>
                                            <th className="text-left p-3 w-24">Amallar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.length === 0 ? (
                                            <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Savollar topilmadi</td></tr>
                                        ) : items.map(q => (
                                            <tr key={q.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                                <td className="p-3 font-medium">
                                                    <span className="inline-block px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold">{q.level}</span>
                                                </td>
                                                <td className="p-3 max-w-[300px]" dir="rtl" title={q.prompt}>
                                                    {q.prompt.slice(0, 80)}{q.prompt.length > 80 ? "…" : ""}
                                                </td>
                                                <td className="p-3 font-mono font-bold text-primary">{optionLabels[q.correctIndex]}</td>
                                                <td className="p-3">
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(q)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        {deleteConfirm === q.id ? (
                                                            <>
                                                                <Button variant="destructive" size="sm" className="h-8 text-xs"
                                                                    onClick={() => deleteMut.mutate(q.id)} disabled={deleteMut.isPending}>Ha</Button>
                                                                <Button variant="outline" size="sm" className="h-8 text-xs"
                                                                    onClick={() => setDeleteConfirm(null)}>Yo'q</Button>
                                                            </>
                                                        ) : (
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                                onClick={() => setDeleteConfirm(q.id)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between p-3 border-t">
                                    <p className="text-sm text-muted-foreground">Sahifa {page} / {totalPages}</p>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
                    onClick={() => !createMut.isPending && !updateMut.isPending && setModalOpen(false)}>
                    <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-lg"
                        onClick={e => e.stopPropagation()}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle>{editingId ? "Savolni tahrirlash" : "Yangi savol"}</CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>✕</Button>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">CEFR darajasi</label>
                                    <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" required>
                                        {CEFR_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Savol matni (arabcha)</label>
                                    <textarea value={form.prompt} onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
                                        className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        dir="rtl" placeholder="اختر الإجابة الصحيحة..." required />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {(["optionA", "optionB", "optionC", "optionD"] as const).map((key, idx) => (
                                        <div key={key}>
                                            <label className="block text-sm font-medium mb-1">
                                                Variant {optionLabels[idx]}
                                                {form.correctIndex === idx && <span className="text-primary ml-1">✓ to'g'ri</span>}
                                            </label>
                                            <input type="text" value={form[key]}
                                                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                                dir="rtl" required />
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">To'g'ri javob</label>
                                    <select value={form.correctIndex} onChange={e => setForm(f => ({ ...f, correctIndex: Number(e.target.value) }))}
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                        {optionLabels.map((l, i) => <option key={i} value={i}>{l}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Teglar (vergul bilan)</label>
                                    <input type="text" value={form.tags}
                                        onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                        placeholder="nahv, sarf, i'rob" />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button type="submit" className="rounded-xl gap-2" disabled={createMut.isPending || updateMut.isPending}>
                                        {(createMut.isPending || updateMut.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                                        {editingId ? "Saqlash" : "Qo'shish"}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Bekor qilish</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </motion.div>
    );
}
