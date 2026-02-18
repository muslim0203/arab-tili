import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/PageHeader";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import {
    Loader2, ChevronLeft, ChevronRight, Plus, Pencil, Trash2,
    Upload, Headphones, ChevronDown, ChevronUp, Volume2,
    Play,
} from "lucide-react";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const STAGE_TYPES = [
    { value: "short_dialogue", label: "Qisqa dialog (المحادثة القصيرة)", titleArabic: "المحادثة القصيرة", timeMode: "per_question", perQuestionSeconds: 60, totalSeconds: null, maxPlays: 2 },
    { value: "long_conversation", label: "Uzun suhbat (المحادثة الطويلة / الرواية)", titleArabic: "المحادثة الطويلة / الرواية", timeMode: "total", perQuestionSeconds: null, totalSeconds: 420, maxPlays: 2 },
    { value: "lecture", label: "Ma'ruza (المحاضرة)", titleArabic: "المحاضرة", timeMode: "total", perQuestionSeconds: null, totalSeconds: 420, maxPlays: 2 },
] as const;

type ListeningQuestionItem = {
    id: string;
    prompt: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctIndex: number;
    orderIndex: number;
};

type ListeningStageItem = {
    id: string;
    level: string;
    stageType: string;
    titleArabic: string;
    audioUrl: string;
    maxPlays: number;
    timeMode: string;
    perQuestionSeconds: number | null;
    totalSeconds: number | null;
    questions: ListeningQuestionItem[];
    createdAt: string;
};

type QuestionForm = { prompt: string; optionA: string; optionB: string; optionC: string; optionD: string; correctIndex: number };
const emptyQuestion: QuestionForm = { prompt: "", optionA: "", optionB: "", optionC: "", optionD: "", correctIndex: 0 };

const emptyForm = {
    level: "A1",
    stageType: "short_dialogue" as string,
    titleArabic: "المحادثة القصيرة",
    audioUrl: "",
    maxPlays: 2,
    timeMode: "per_question",
    perQuestionSeconds: 60 as number | null,
    totalSeconds: null as number | null,
    questions: Array.from({ length: 5 }, () => ({ ...emptyQuestion })),
};

type ListResponse = { items: ListeningStageItem[]; total: number; page: number; pageSize: number; totalPages: number };

export function AdminListening() {
    const qc = useQueryClient();
    const [page, setPage] = useState(1);
    const [levelFilter, setLevelFilter] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [audioUploading, setAudioUploading] = useState(false);
    const [audioUploadError, setAudioUploadError] = useState<string | null>(null);
    const audioFileInputRef = useRef<HTMLInputElement>(null);

    const params = new URLSearchParams();
    if (levelFilter) params.set("level", levelFilter);
    params.set("page", String(page));
    params.set("pageSize", "20");

    const { data, isLoading } = useQuery({
        queryKey: ["admin-listening", levelFilter, page],
        queryFn: () => api<ListResponse>(`/admin/listening?${params}`),
    });

    const createMut = useMutation({
        mutationFn: (body: Record<string, unknown>) => api("/admin/listening", { method: "POST", body }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-listening"] }); closeModal(); },
    });

    const updateMut = useMutation({
        mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
            api(`/admin/listening/${id}`, { method: "PUT", body }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-listening"] }); closeModal(); },
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => api(`/admin/listening/${id}`, { method: "DELETE" }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-listening"] }); setDeleteConfirm(null); },
    });

    const closeModal = () => { setModalOpen(false); setForm(emptyForm); setEditingId(null); setAudioUploadError(null); };

    const openCreate = useCallback(() => {
        setForm({ ...emptyForm, questions: Array.from({ length: 5 }, () => ({ ...emptyQuestion })) });
        setEditingId(null);
        setModalOpen(true);
        setAudioUploadError(null);
    }, []);

    const openEdit = useCallback((item: ListeningStageItem) => {
        setForm({
            level: item.level,
            stageType: item.stageType,
            titleArabic: item.titleArabic,
            audioUrl: item.audioUrl,
            maxPlays: item.maxPlays,
            timeMode: item.timeMode,
            perQuestionSeconds: item.perQuestionSeconds,
            totalSeconds: item.totalSeconds,
            questions: item.questions.map(q => ({
                prompt: q.prompt, optionA: q.optionA, optionB: q.optionB,
                optionC: q.optionC, optionD: q.optionD, correctIndex: q.correctIndex,
            })),
        });
        // Ensure 5 questions
        while (form.questions.length < 5) form.questions.push({ ...emptyQuestion });
        setEditingId(item.id);
        setModalOpen(true);
        setAudioUploadError(null);
    }, []);

    const handleStageTypeChange = (type: string) => {
        const st = STAGE_TYPES.find(s => s.value === type)!;
        setForm(f => ({
            ...f,
            stageType: type,
            titleArabic: st.titleArabic,
            timeMode: st.timeMode,
            perQuestionSeconds: st.perQuestionSeconds,
            totalSeconds: st.totalSeconds,
            maxPlays: st.maxPlays,
        }));
    };

    const updateQuestion = (idx: number, field: keyof QuestionForm, value: string | number) => {
        setForm(f => {
            const qs = [...f.questions];
            qs[idx] = { ...qs[idx], [field]: value };
            return { ...f, questions: qs };
        });
    };

    const uploadAudio = useCallback(async (file: File) => {
        setAudioUploadError(null);
        setAudioUploading(true);
        try {
            const token = useAuthStore.getState().accessToken;
            const fd = new FormData();
            fd.append("audio", file);
            const res = await fetch("/api/admin/upload-audio", {
                method: "POST",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: fd,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: res.statusText }));
                throw new Error(err.message || "Yuklash muvaffaqiyatsiz");
            }
            const data = (await res.json()) as { audioUrl: string };
            setForm(f => ({ ...f, audioUrl: data.audioUrl }));
        } catch (e) {
            setAudioUploadError(e instanceof Error ? e.message : "Xatolik");
        } finally {
            setAudioUploading(false);
            if (audioFileInputRef.current) audioFileInputRef.current.value = "";
        }
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.audioUrl) { setAudioUploadError("Audio fayl yuklang!"); return; }
        const body = {
            level: form.level, stageType: form.stageType, titleArabic: form.titleArabic,
            audioUrl: form.audioUrl, maxPlays: form.maxPlays, timeMode: form.timeMode,
            perQuestionSeconds: form.perQuestionSeconds, totalSeconds: form.totalSeconds,
            questions: form.questions.map(q => ({ ...q, correctIndex: Number(q.correctIndex) })),
        };
        if (editingId) updateMut.mutate({ id: editingId, body });
        else createMut.mutate(body);
    };

    const items = data?.items ?? [];
    const totalPages = data?.totalPages ?? 0;
    const optionLabels = ["A", "B", "C", "D"];
    const stageTypeLabel = (t: string) => STAGE_TYPES.find(s => s.value === t)?.label ?? t;

    return (
        <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <PageHeader
                title="Tinglash bo'limi (Listening)"
                subtitle="Har bir bosqich: audio fayl + 5 ta savol. Bosqich turi bo'yicha avtomatik vaqt sozlamalari."
                action={<Button className="rounded-xl gap-2" onClick={openCreate}><Plus className="h-4 w-4" />Yangi bosqich</Button>}
            />

            <Card className="rounded-xl border-border shadow-sm overflow-hidden">
                <CardHeader className="pb-2">
                    <div className="flex flex-wrap gap-3 items-center">
                        <CardTitle className="text-base">Listening Stages</CardTitle>
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
                                    <div className="p-8 text-center text-muted-foreground">Bosqichlar topilmadi</div>
                                ) : items.map(s => (
                                    <div key={s.id} className="hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded(e => e === s.id ? null : s.id)}>
                                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 text-xs font-bold">{s.level}</span>
                                            <Headphones className="h-4 w-4 text-emerald-500" />
                                            <span className="text-sm font-medium" dir="rtl">{s.titleArabic}</span>
                                            <span className="text-xs text-muted-foreground">({stageTypeLabel(s.stageType)})</span>
                                            <span className="text-xs text-muted-foreground ml-auto">{s.questions.length} savol</span>
                                            <span className="text-xs text-muted-foreground">
                                                {s.timeMode === "per_question" ? `${s.perQuestionSeconds}s/savol` : `${s.totalSeconds}s jami`}
                                            </span>
                                            {expanded === s.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={e => { e.stopPropagation(); openEdit(s); }}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            {deleteConfirm === s.id ? (
                                                <>
                                                    <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={e => { e.stopPropagation(); deleteMut.mutate(s.id); }}>Ha</Button>
                                                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={e => { e.stopPropagation(); setDeleteConfirm(null); }}>Yo'q</Button>
                                                </>
                                            ) : (
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={e => { e.stopPropagation(); setDeleteConfirm(s.id); }}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                        {expanded === s.id && (
                                            <div className="px-4 pb-4 space-y-3">
                                                {/* Audio preview */}
                                                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                                    <Volume2 className="h-4 w-4 text-emerald-500" />
                                                    <span className="text-sm text-muted-foreground flex-1 truncate">{s.audioUrl}</span>
                                                    <audio controls preload="none" className="h-8">
                                                        <source src={s.audioUrl} />
                                                    </audio>
                                                </div>
                                                {/* Questions */}
                                                <div className="space-y-1">
                                                    {s.questions.map((q, i) => (
                                                        <div key={q.id} className="flex gap-2 items-start text-sm p-2 rounded bg-background border border-border">
                                                            <span className="font-bold text-muted-foreground w-6 shrink-0">{i + 1}.</span>
                                                            <div className="flex-1" dir="rtl">
                                                                <p className="font-medium">{q.prompt}</p>
                                                                <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                                                    {[q.optionA, q.optionB, q.optionC, q.optionD].map((o, oi) => (
                                                                        <span key={oi} className={oi === q.correctIndex ? "text-emerald-600 font-bold" : ""}>
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
                    onClick={() => !createMut.isPending && !updateMut.isPending && closeModal()}>
                    <Card className="w-full max-w-3xl rounded-xl shadow-lg mb-8" onClick={e => e.stopPropagation()}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle>{editingId ? "Bosqichni tahrirlash" : "Yangi bosqich"}</CardTitle>
                            <Button variant="ghost" size="sm" onClick={closeModal}>✕</Button>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">CEFR darajasi</label>
                                        <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" required>
                                            {CEFR_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Bosqich turi</label>
                                        <select value={form.stageType} onChange={e => handleStageTypeChange(e.target.value)}
                                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                            {STAGE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Auto-filled info */}
                                <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Arabcha nomi</p>
                                        <p className="font-semibold text-sm" dir="rtl">{form.titleArabic}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Vaqt rejimi</p>
                                        <p className="font-semibold text-sm">
                                            {form.timeMode === "per_question" ? `Har savol: ${form.perQuestionSeconds}s` : `Jami: ${form.totalSeconds}s`}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Maks tinglash</p>
                                        <p className="font-semibold text-sm">{form.maxPlays} marta</p>
                                    </div>
                                </div>

                                {/* Audio upload */}
                                <div>
                                    <label className="block text-sm font-medium mb-1">Audio fayl (mp3)</label>
                                    <div className="flex gap-2 items-center flex-wrap">
                                        <input type="text" value={form.audioUrl} readOnly
                                            className="h-10 flex-1 min-w-[200px] rounded-md border border-input bg-muted/50 px-3 text-sm"
                                            placeholder="Audio yuklanmadi..." />
                                        <input ref={audioFileInputRef} type="file" accept="audio/*" className="sr-only"
                                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadAudio(f); }} />
                                        <Button type="button" variant="outline" className="gap-2 shrink-0"
                                            disabled={audioUploading} onClick={() => audioFileInputRef.current?.click()}>
                                            {audioUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                            {audioUploading ? "Yuklanmoqda…" : "Fayl yuklash"}
                                        </Button>
                                        {form.audioUrl && (
                                            <Button type="button" variant="ghost" size="sm" className="gap-1"
                                                onClick={() => { const a = new Audio(form.audioUrl); a.play(); }}>
                                                <Play className="h-3 w-3" /> Tinglash
                                            </Button>
                                        )}
                                    </div>
                                    {audioUploadError && <p className="text-sm text-destructive mt-1">{audioUploadError}</p>}
                                </div>

                                {/* 5 Questions */}
                                <div>
                                    <h3 className="text-sm font-semibold mb-3">Savollar (5 ta)</h3>
                                    <div className="space-y-4">
                                        {form.questions.map((q, qi) => (
                                            <div key={qi} className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
                                                <span className="text-sm font-bold text-muted-foreground">Savol {qi + 1}</span>
                                                <textarea value={q.prompt} onChange={e => updateQuestion(qi, "prompt", e.target.value)}
                                                    className="w-full min-h-[50px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                    dir="rtl" placeholder="سؤال..." required />
                                                <div className="grid grid-cols-2 gap-2">
                                                    {(["optionA", "optionB", "optionC", "optionD"] as const).map((key, oi) => (
                                                        <div key={key} className="flex items-center gap-2">
                                                            <span className={`text-xs font-bold w-5 ${q.correctIndex === oi ? 'text-emerald-600' : 'text-muted-foreground'}`}>{optionLabels[oi]}</span>
                                                            <input type="text" value={q[key]}
                                                                onChange={e => updateQuestion(qi, key, e.target.value)}
                                                                className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                                                                dir="rtl" required />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div>
                                                    <label className="text-xs text-muted-foreground">To'g'ri:</label>
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
