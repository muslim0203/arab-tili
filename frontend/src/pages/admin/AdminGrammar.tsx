import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Save, X } from "lucide-react";

interface GrammarQ {
    id: string;
    difficulty: string;
    prompt: string;
    options: string; // JSON
    correctIndex: number;
    createdAt: string;
}

interface Paginated { items: GrammarQ[]; total: number; page: number; pageSize: number; totalPages: number; }

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const DIFF_LABEL: Record<string, string> = { easy: "Oson", medium: "O'rta", hard: "Qiyin" };
const DIFF_BADGE: Record<string, string> = {
    easy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    hard: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const emptyForm = { difficulty: "easy" as string, prompt: "", options: ["", "", "", ""], correctIndex: 0 };

export function AdminGrammar() {
    const [data, setData] = useState<Paginated | null>(null);
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<string | null>(null); // id or "new"
    const [form, setForm] = useState({ ...emptyForm });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page), pageSize: "15" });
        if (filter) params.set("difficulty", filter);
        const d = await api<Paginated>(`/admin/grammar?${params}`);
        setData(d);
        setLoading(false);
    }, [page, filter]);

    useEffect(() => { load(); }, [load]);

    const openNew = () => {
        setForm({ ...emptyForm });
        setEditing("new");
    };

    const openEdit = (q: GrammarQ) => {
        const opts: string[] = JSON.parse(q.options);
        setForm({ difficulty: q.difficulty, prompt: q.prompt, options: opts, correctIndex: q.correctIndex });
        setEditing(q.id);
    };

    const save = async () => {
        if (!form.prompt.trim() || form.options.some((o) => !o.trim())) return;
        setSaving(true);
        try {
            const body = { difficulty: form.difficulty, prompt: form.prompt, options: form.options, correctIndex: form.correctIndex };
            if (editing === "new") {
                await api("/admin/grammar", { method: "POST", body });
            } else {
                await api(`/admin/grammar/${editing}`, { method: "PUT", body });
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
        if (!confirm("Haqiqatan ham o'chirmoqchimisiz?")) return;
        await api(`/admin/grammar/${id}`, { method: "DELETE" });
        await load();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">📝 Grammatika savollari</h1>
                    <p className="text-sm text-muted-foreground">Har bir savol: 1 prompt + 4 variant + to'g'ri javob</p>
                </div>
                <Button onClick={openNew} className="gap-2 rounded-xl">
                    <Plus className="h-4 w-4" /> Yangi savol
                </Button>
            </div>

            {/* Filter */}
            <div className="flex gap-2">
                <Button variant={filter === "" ? "secondary" : "ghost"} size="sm" className="rounded-lg" onClick={() => { setFilter(""); setPage(1); }}>Barchasi</Button>
                {DIFFICULTIES.map((d) => (
                    <Button key={d} variant={filter === d ? "secondary" : "ghost"} size="sm" className="rounded-lg" onClick={() => { setFilter(d); setPage(1); }}>
                        {DIFF_LABEL[d]}
                    </Button>
                ))}
                {data && <span className="ml-auto text-sm text-muted-foreground self-center">Jami: {data.total}</span>}
            </div>

            {/* Edit/Create form */}
            {editing && (
                <div className="rounded-xl border border-primary/30 bg-card p-5 shadow-md space-y-4">
                    <h3 className="font-semibold">{editing === "new" ? "➕ Yangi savol" : "✏️ Savolni tahrirlash"}</h3>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">Qiyinlik</label>
                            <select
                                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                value={form.difficulty}
                                onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
                            >
                                {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFF_LABEL[d]}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">To'g'ri javob</label>
                            <select
                                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                value={form.correctIndex}
                                onChange={(e) => setForm((f) => ({ ...f, correctIndex: Number(e.target.value) }))}
                            >
                                {[0, 1, 2, 3].map((i) => <option key={i} value={i}>Variant {String.fromCharCode(65 + i)}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium">Savol matni (عربي)</label>
                        <textarea
                            dir="rtl"
                            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                            value={form.prompt}
                            onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                            placeholder="اختر الإجابة الصحيحة..."
                        />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        {form.options.map((opt, i) => (
                            <div key={i}>
                                <label className="text-sm font-medium flex items-center gap-2">
                                    Variant {String.fromCharCode(65 + i)}
                                    {i === form.correctIndex && <span className="text-xs text-emerald-600 font-bold">✓ To'g'ri</span>}
                                </label>
                                <Input
                                    dir="rtl"
                                    className="mt-1"
                                    value={opt}
                                    onChange={(e) => {
                                        const opts = [...form.options];
                                        opts[i] = e.target.value;
                                        setForm((f) => ({ ...f, options: opts }));
                                    }}
                                    placeholder={`Variant ${String.fromCharCode(65 + i)}`}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => setEditing(null)} className="gap-2 rounded-xl">
                            <X className="h-4 w-4" /> Bekor
                        </Button>
                        <Button onClick={save} disabled={saving} className="gap-2 rounded-xl">
                            <Save className="h-4 w-4" /> {saving ? "Saqlanmoqda..." : "Saqlash"}
                        </Button>
                    </div>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                <th className="px-4 py-3 text-left font-medium">#</th>
                                <th className="px-4 py-3 text-left font-medium">Qiyinlik</th>
                                <th className="px-4 py-3 text-right font-medium">Savol</th>
                                <th className="px-4 py-3 text-center font-medium">To'g'ri</th>
                                <th className="px-4 py-3 text-right font-medium">Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.items.map((q, idx) => {
                                const opts: string[] = JSON.parse(q.options);
                                return (
                                    <tr key={q.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 text-muted-foreground">{(data.page - 1) * data.pageSize + idx + 1}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${DIFF_BADGE[q.difficulty]}`}>
                                                {DIFF_LABEL[q.difficulty]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right max-w-[300px] truncate" dir="rtl">{q.prompt}</td>
                                        <td className="px-4 py-3 text-center" dir="rtl">
                                            <span className="text-emerald-600 font-medium">{opts[q.correctIndex]}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1 justify-end">
                                                <Button variant="ghost" size="sm" onClick={() => openEdit(q)} className="h-8 w-8 p-0 rounded-lg">
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => remove(q.id)} className="h-8 w-8 p-0 rounded-lg text-destructive hover:text-destructive">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {data?.items.length === 0 && (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Hali savollar yo'q</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {data && data.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">{page} / {data.totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
