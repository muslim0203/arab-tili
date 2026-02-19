import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Save, X } from "lucide-react";

interface WritingT {
    id: string; difficulty: string; prompt: string;
    wordLimitMin: number; wordLimitMax: number; rubric: string; createdAt: string;
}
interface Paginated { items: WritingT[]; total: number; page: number; pageSize: number; totalPages: number; }

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const DIFF_LABEL: Record<string, string> = { easy: "Oson", medium: "O'rta", hard: "Qiyin" };
const DIFF_BADGE: Record<string, string> = {
    easy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    hard: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

interface WForm { difficulty: string; prompt: string; wordLimitMin: number; wordLimitMax: number; rubric: string; }
const emptyForm = (): WForm => ({ difficulty: "easy", prompt: "", wordLimitMin: 100, wordLimitMax: 200, rubric: "[]" });

export function AdminWriting() {
    const [data, setData] = useState<Paginated | null>(null);
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<string | null>(null);
    const [form, setForm] = useState<WForm>(emptyForm());
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page), pageSize: "15" });
        if (filter) params.set("difficulty", filter);
        const d = await api<Paginated>(`/admin/writing?${params}`);
        setData(d);
        setLoading(false);
    }, [page, filter]);

    useEffect(() => { load(); }, [load]);

    const openNew = () => { setForm(emptyForm()); setEditing("new"); };
    const openEdit = (t: WritingT) => {
        setForm({ difficulty: t.difficulty, prompt: t.prompt, wordLimitMin: t.wordLimitMin, wordLimitMax: t.wordLimitMax, rubric: t.rubric });
        setEditing(t.id);
    };

    const save = async () => {
        if (!form.prompt.trim()) { alert("Prompt kiritilishi shart"); return; }
        setSaving(true);
        try {
            const body = { ...form, rubric: form.rubric };
            if (editing === "new") {
                await api("/admin/writing", { method: "POST", body });
            } else {
                await api(`/admin/writing/${editing}`, { method: "PUT", body });
            }
            setEditing(null);
            await load();
        } catch (e: unknown) { alert(e instanceof Error ? e.message : "Xatolik"); }
        finally { setSaving(false); }
    };

    const remove = async (id: string) => {
        if (!confirm("O'chirmoqchimisiz?")) return;
        await api(`/admin/writing/${id}`, { method: "DELETE" });
        await load();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">✍️ Yozish (Writing) Tasks</h1>
                    <p className="text-sm text-muted-foreground">Yozma topshiriqlar — keyinchalik implement qilinadi</p>
                </div>
                <Button onClick={openNew} className="gap-2 rounded-xl"><Plus className="h-4 w-4" /> Yangi task</Button>
            </div>

            <div className="flex gap-2">
                <Button variant={filter === "" ? "secondary" : "ghost"} size="sm" className="rounded-lg" onClick={() => { setFilter(""); setPage(1); }}>Barchasi</Button>
                {DIFFICULTIES.map((d) => (
                    <Button key={d} variant={filter === d ? "secondary" : "ghost"} size="sm" className="rounded-lg" onClick={() => { setFilter(d); setPage(1); }}>{DIFF_LABEL[d]}</Button>
                ))}
            </div>

            {editing && (
                <div className="rounded-xl border border-primary/30 bg-card p-5 shadow-md space-y-4">
                    <h3 className="font-semibold">{editing === "new" ? "➕ Yangi task" : "✏️ Tahrirlash"}</h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <label className="text-sm font-medium">Qiyinlik</label>
                            <select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}>
                                {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFF_LABEL[d]}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Min so'z</label>
                            <Input type="number" className="mt-1" value={form.wordLimitMin} onChange={(e) => setForm((f) => ({ ...f, wordLimitMin: Number(e.target.value) }))} />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Max so'z</label>
                            <Input type="number" className="mt-1" value={form.wordLimitMax} onChange={(e) => setForm((f) => ({ ...f, wordLimitMax: Number(e.target.value) }))} />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium">Prompt (عربي)</label>
                        <textarea dir="rtl" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[80px]" value={form.prompt} onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))} />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Rubric (JSON)</label>
                        <textarea className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[80px] font-mono text-xs" value={form.rubric} onChange={(e) => setForm((f) => ({ ...f, rubric: e.target.value }))} placeholder='[{"criteriaName":"...", "maxPoints":5, "description":"..."}]' />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => setEditing(null)} className="gap-2 rounded-xl"><X className="h-4 w-4" /> Bekor</Button>
                        <Button onClick={save} disabled={saving} className="gap-2 rounded-xl"><Save className="h-4 w-4" /> {saving ? "Saqlanmoqda..." : "Saqlash"}</Button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b bg-muted/50">
                            <th className="px-4 py-3 text-left font-medium">#</th>
                            <th className="px-4 py-3 text-left font-medium">Qiyinlik</th>
                            <th className="px-4 py-3 text-right font-medium">Prompt</th>
                            <th className="px-4 py-3 text-center font-medium">So'z limiti</th>
                            <th className="px-4 py-3 text-right font-medium">Amallar</th>
                        </tr></thead>
                        <tbody>
                            {data?.items.map((t, i) => (
                                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-3 text-muted-foreground">{(data.page - 1) * data.pageSize + i + 1}</td>
                                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${DIFF_BADGE[t.difficulty]}`}>{DIFF_LABEL[t.difficulty]}</span></td>
                                    <td className="px-4 py-3 text-right max-w-[300px] truncate" dir="rtl">{t.prompt}</td>
                                    <td className="px-4 py-3 text-center text-xs">{t.wordLimitMin}–{t.wordLimitMax}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-1 justify-end">
                                            <Button variant="ghost" size="sm" onClick={() => openEdit(t)} className="h-8 w-8 p-0"><Pencil className="h-3.5 w-3.5" /></Button>
                                            <Button variant="ghost" size="sm" onClick={() => remove(t.id)} className="h-8 w-8 p-0 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {data?.items.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Hali tasklar yo'q</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

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
