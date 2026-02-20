import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Save, X, Mic } from "lucide-react";

interface SpeakingTopic {
    id: string;
    difficulty: string;
    prompt: string;
    createdAt: string;
}
interface Paginated {
    items: SpeakingTopic[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const DIFF_LABEL: Record<string, string> = { easy: "Oson", medium: "O'rta", hard: "Qiyin" };
const DIFF_BADGE: Record<string, string> = {
    easy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    hard: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

interface TopicForm {
    difficulty: string;
    prompt: string;
}

const emptyForm = (): TopicForm => ({
    difficulty: "easy",
    prompt: "",
});

export function AdminSpeaking() {
    const [data, setData] = useState<Paginated | null>(null);
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<string | null>(null);
    const [form, setForm] = useState<TopicForm>(emptyForm());
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page), pageSize: "15" });
        if (filter) params.set("difficulty", filter);
        const d = await api<Paginated>(`/admin/speaking?${params}`);
        setData(d);
        setLoading(false);
    }, [page, filter]);

    useEffect(() => { load(); }, [load]);

    const openNew = () => { setForm(emptyForm()); setEditing("new"); };
    const openEdit = (t: SpeakingTopic) => {
        setForm({ difficulty: t.difficulty, prompt: t.prompt });
        setEditing(t.id);
    };

    const save = async () => {
        if (!form.prompt.trim()) {
            alert("Mavzu matni kiritilishi shart!");
            return;
        }
        setSaving(true);
        try {
            const body = { difficulty: form.difficulty, prompt: form.prompt.trim() };
            if (editing === "new") await api("/admin/speaking", { method: "POST", body });
            else await api(`/admin/speaking/${editing}`, { method: "PUT", body });
            setEditing(null);
            await load();
        } catch (e: unknown) { alert(e instanceof Error ? e.message : "Xatolik"); }
        finally { setSaving(false); }
    };

    const remove = async (id: string) => {
        if (!confirm("Bu mavzuni o'chirmoqchimisiz?")) return;
        await api(`/admin/speaking/${id}`, { method: "DELETE" });
        await load();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Mic className="h-6 w-6 text-rose-500" />
                        Gapirish mavzulari
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Talaba shu mavzu asosida arab tilida gapiradi. Oson, o'rta, qiyin darajalar.
                    </p>
                </div>
                <Button onClick={openNew} className="gap-2 rounded-xl">
                    <Plus className="h-4 w-4" /> Yangi mavzu
                </Button>
            </div>

            {/* Difficulty filters */}
            <div className="flex gap-2">
                <Button
                    variant={filter === "" ? "secondary" : "ghost"}
                    size="sm"
                    className="rounded-lg"
                    onClick={() => { setFilter(""); setPage(1); }}
                >
                    Barchasi{data ? ` (${data.total})` : ""}
                </Button>
                {DIFFICULTIES.map((d) => (
                    <Button
                        key={d}
                        variant={filter === d ? "secondary" : "ghost"}
                        size="sm"
                        className="rounded-lg"
                        onClick={() => { setFilter(d); setPage(1); }}
                    >
                        {DIFF_LABEL[d]}
                    </Button>
                ))}
            </div>

            {/* Edit / Create form */}
            {editing && (
                <div className="rounded-xl border border-primary/30 bg-card p-5 shadow-md space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                        {editing === "new" ? (
                            <><Plus className="h-4 w-4 text-primary" /> Yangi mavzu qo'shish</>
                        ) : (
                            <><Pencil className="h-4 w-4 text-primary" /> Mavzuni tahrirlash</>
                        )}
                    </h3>

                    <div>
                        <label className="text-sm font-medium">Qiyinlik darajasi</label>
                        <div className="flex gap-2 mt-2">
                            {DIFFICULTIES.map((d) => (
                                <button
                                    key={d}
                                    onClick={() => setForm((f) => ({ ...f, difficulty: d }))}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${form.difficulty === d
                                            ? d === "easy" ? "bg-emerald-500 text-white shadow-md"
                                                : d === "medium" ? "bg-amber-500 text-white shadow-md"
                                                    : "bg-red-500 text-white shadow-md"
                                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                                        }`}
                                >
                                    {DIFF_LABEL[d]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium">
                            Mavzu matni (arab tilida)
                        </label>
                        <textarea
                            dir="rtl"
                            className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-3 text-base min-h-[100px] font-arabic leading-relaxed focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                            placeholder="مثلاً: عَرِّف نَفسَكَ: ما اسمُكَ؟ وَمِن أيْنَ أنتَ؟"
                            value={form.prompt}
                            onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Talaba imtihonda shu mavzuni ko'radi va shu haqda gapiradi
                        </p>
                    </div>

                    <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => setEditing(null)} className="gap-2 rounded-xl">
                            <X className="h-4 w-4" /> Bekor qilish
                        </Button>
                        <Button onClick={save} disabled={saving || !form.prompt.trim()} className="gap-2 rounded-xl">
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
                                <th className="px-4 py-3 text-left font-medium w-12">#</th>
                                <th className="px-4 py-3 text-left font-medium w-24">Daraja</th>
                                <th className="px-4 py-3 text-right font-medium">Mavzu matni</th>
                                <th className="px-4 py-3 text-right font-medium w-24">Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.items.map((t, i) => (
                                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {(data.page - 1) * data.pageSize + i + 1}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${DIFF_BADGE[t.difficulty]}`}>
                                            {DIFF_LABEL[t.difficulty]}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right" dir="rtl">
                                        <p className="font-arabic text-base leading-relaxed line-clamp-2">
                                            {t.prompt}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-1 justify-end">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openEdit(t)}
                                                className="h-8 w-8 p-0"
                                                title="Tahrirlash"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => remove(t.id)}
                                                className="h-8 w-8 p-0 text-destructive"
                                                title="O'chirish"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {data?.items.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                                        <Mic className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                        Hali mavzular yo'q. "Yangi mavzu" tugmasini bosing.
                                    </td>
                                </tr>
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
                    <span className="text-sm text-muted-foreground">
                        {page} / {data.totalPages}
                    </span>
                    <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
