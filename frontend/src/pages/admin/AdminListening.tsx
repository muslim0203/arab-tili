import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Headphones, Plus, Save, X, Trash2, Upload, CheckCircle2,
    AlertTriangle, ChevronDown, ChevronUp, Settings2, Music,
} from "lucide-react";

/** Audio fayllar backend (Railway) serverda saqlangan — to'liq URL yasash */
function fullAudioUrl(audioUrl: string | null | undefined): string {
    if (!audioUrl) return "";
    if (audioUrl.startsWith("http://") || audioUrl.startsWith("https://")) return audioUrl;
    const apiBase = import.meta.env.VITE_API_URL || "/api";
    const backendOrigin = apiBase.replace(/\/api\/?$/, "");
    if (backendOrigin && backendOrigin.startsWith("http")) {
        return `${backendOrigin}${audioUrl.startsWith("/") ? "" : "/"}${audioUrl}`;
    }
    return audioUrl;
}

interface ListeningQ {
    id: string; stageId: string; difficulty: string; prompt: string;
    options: string; correctIndex: number; audioUrl: string;
    maxPlays: number; orderIndex: number; createdAt: string;
}

interface Stage {
    id: string; stageType: string; titleArabic: string;
    timingMode: string; perQuestionSeconds: number | null; totalSeconds: number | null;
    questions: ListeningQ[];
    questionCount: number; isComplete: boolean;
}

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const DIFF_LABEL: Record<string, string> = { easy: "Oson", medium: "O'rta", hard: "Qiyin" };
const DIFF_BADGE: Record<string, string> = {
    easy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    hard: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};
const STAGE_ICON: Record<string, string> = {
    short_dialogue: "🗣️",
    long_conversation: "💬",
    lecture: "🎓",
};
const TIMING_LABEL: Record<string, string> = {
    per_question: "Har savol uchun alohida vaqt",
    total: "Umumiy vaqt (barcha savollar uchun)",
};

interface QForm {
    difficulty: string; prompt: string; options: string[];
    correctIndex: number; audioUrl: string; maxPlays: number;
    audioFile?: File;
}

const emptyQForm = (): QForm => ({
    difficulty: "easy", prompt: "", options: ["", "", "", ""],
    correctIndex: 0, audioUrl: "", maxPlays: 2,
});

export function AdminListening() {
    const [stages, setStages] = useState<Stage[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedStage, setExpandedStage] = useState<string | null>(null);
    const [addingTo, setAddingTo] = useState<string | null>(null);
    const [qForm, setQForm] = useState<QForm>(emptyQForm());
    const [saving, setSaving] = useState(false);
    const [editSettings, setEditSettings] = useState<string | null>(null);
    const [settingsForm, setSettingsForm] = useState({ timingMode: "", perQuestionSeconds: 0, totalSeconds: 0 });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api<Stage[]>("/admin/listening/stages");
            setStages(data);
        } catch { /* ignore */ }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    // Upload audio file
    const uploadAudio = async (file: File): Promise<string> => {
        const fd = new FormData();
        fd.append("audio", file);
        const res = await api<{ audioUrl: string }>("/admin/upload-audio", { method: "POST", body: fd });
        return res.audioUrl;
    };

    // Add question
    const addQuestion = async () => {
        if (!addingTo) return;
        if (!qForm.prompt.trim() || qForm.options.some((o) => !o.trim())) {
            alert("Barcha maydonlarni to'ldiring"); return;
        }
        if (!qForm.audioUrl && !qForm.audioFile) {
            alert("Audio fayl yuklang"); return;
        }

        setSaving(true);
        try {
            let audioUrl = qForm.audioUrl;
            if (qForm.audioFile) {
                audioUrl = await uploadAudio(qForm.audioFile);
            }
            await api("/admin/listening/questions", {
                method: "POST",
                body: {
                    stageId: addingTo,
                    difficulty: qForm.difficulty,
                    prompt: qForm.prompt,
                    options: qForm.options,
                    correctIndex: qForm.correctIndex,
                    audioUrl,
                    maxPlays: qForm.maxPlays,
                },
            });
            setAddingTo(null);
            setQForm(emptyQForm());
            await load();
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : "Xatolik");
        } finally {
            setSaving(false);
        }
    };

    // Delete question
    const deleteQuestion = async (qId: string) => {
        if (!confirm("Savolni o'chirmoqchimisiz?")) return;
        await api(`/admin/listening/questions/${qId}`, { method: "DELETE" });
        await load();
    };

    // Update stage settings
    const saveSettings = async () => {
        if (!editSettings) return;
        setSaving(true);
        try {
            await api(`/admin/listening/stages/${editSettings}`, {
                method: "PUT",
                body: {
                    timingMode: settingsForm.timingMode,
                    perQuestionSeconds: settingsForm.timingMode === "per_question" ? settingsForm.perQuestionSeconds : null,
                    totalSeconds: settingsForm.timingMode === "total" ? settingsForm.totalSeconds : null,
                },
            });
            setEditSettings(null);
            await load();
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : "Xatolik");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">🎧 Tinglash (Listening)</h1>
                <p className="text-sm text-muted-foreground">3 ta bosqich, har birida cheksiz savol (imtihonda har stage'dan random 5 ta tushadi)</p>
            </div>

            {/* Stages */}
            <div className="space-y-4">
                {stages.map((stage) => (
                    <div key={stage.id} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                        {/* Stage header */}
                        <div
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => setExpandedStage((prev) => prev === stage.id ? null : stage.id)}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{STAGE_ICON[stage.stageType] || "🎵"}</span>
                                <div>
                                    <h3 className="font-semibold" dir="rtl">{stage.titleArabic}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-muted-foreground">{TIMING_LABEL[stage.timingMode]}</span>
                                        <span className="text-xs text-muted-foreground">
                                            ({stage.timingMode === "per_question"
                                                ? `${stage.perQuestionSeconds}s/savol`
                                                : `${stage.totalSeconds}s umumiy`})
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                {/* Status badge */}
                                {stage.isComplete ? (
                                    <span className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2.5 py-1 rounded-full font-medium">
                                        <CheckCircle2 className="h-3.5 w-3.5" /> {stage.questionCount} ta ✓
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-2.5 py-1 rounded-full font-medium">
                                        <AlertTriangle className="h-3.5 w-3.5" /> {stage.questionCount} ta (min 5)
                                    </span>
                                )}
                                <Button
                                    variant="ghost" size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditSettings(stage.id);
                                        setSettingsForm({
                                            timingMode: stage.timingMode,
                                            perQuestionSeconds: stage.perQuestionSeconds ?? 60,
                                            totalSeconds: stage.totalSeconds ?? 420,
                                        });
                                    }}
                                    className="h-8 w-8 p-0"
                                >
                                    <Settings2 className="h-4 w-4" />
                                </Button>
                                {expandedStage === stage.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                        </div>

                        {/* Settings edit */}
                        {editSettings === stage.id && (
                            <div className="border-t border-border p-4 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
                                <h4 className="text-sm font-medium flex items-center gap-2"><Settings2 className="h-4 w-4" /> Vaqt sozlamalari</h4>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div>
                                        <label className="text-xs font-medium">Vaqt rejimi</label>
                                        <select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={settingsForm.timingMode} onChange={(e) => setSettingsForm((f) => ({ ...f, timingMode: e.target.value }))}>
                                            <option value="per_question">Har savol uchun</option>
                                            <option value="total">Umumiy vaqt</option>
                                        </select>
                                    </div>
                                    {settingsForm.timingMode === "per_question" ? (
                                        <div>
                                            <label className="text-xs font-medium">Savol uchun (sek)</label>
                                            <Input type="number" className="mt-1" value={settingsForm.perQuestionSeconds} onChange={(e) => setSettingsForm((f) => ({ ...f, perQuestionSeconds: Number(e.target.value) }))} />
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="text-xs font-medium">Umumiy vaqt (sek)</label>
                                            <Input type="number" className="mt-1" value={settingsForm.totalSeconds} onChange={(e) => setSettingsForm((f) => ({ ...f, totalSeconds: Number(e.target.value) }))} />
                                        </div>
                                    )}
                                    <div className="flex items-end gap-2">
                                        <Button size="sm" onClick={saveSettings} disabled={saving} className="gap-1 rounded-lg"><Save className="h-3.5 w-3.5" /> Saqlash</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditSettings(null)} className="rounded-lg"><X className="h-3.5 w-3.5" /></Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Expanded questions */}
                        {expandedStage === stage.id && (
                            <div className="border-t border-border">
                                {/* Question list */}
                                {stage.questions.length > 0 ? (
                                    <div className="divide-y divide-border">
                                        {stage.questions.map((q, qi) => {
                                            const opts: string[] = JSON.parse(q.options);
                                            return (
                                                <div key={q.id} className="p-4 flex gap-4 hover:bg-muted/20 transition-colors">
                                                    <div className="text-center shrink-0">
                                                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                                                            {qi + 1}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0 space-y-2">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DIFF_BADGE[q.difficulty]}`}>{DIFF_LABEL[q.difficulty]}</span>
                                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                <Music className="h-3 w-3" /> max {q.maxPlays} play
                                                            </span>
                                                        </div>
                                                        <p className="text-sm" dir="rtl">{q.prompt}</p>
                                                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                                                            {opts.map((o, oi) => (
                                                                <div key={oi} className={`rounded px-2 py-1 ${oi === q.correctIndex ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-medium" : "bg-muted"}`} dir="rtl">
                                                                    {String.fromCharCode(65 + oi)}. {o}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {/* Audio player */}
                                                        <audio controls className="w-full h-8 mt-1" preload="none">
                                                            <source src={fullAudioUrl(q.audioUrl)} />
                                                        </audio>
                                                    </div>
                                                    <Button variant="ghost" size="sm" onClick={() => deleteQuestion(q.id)} className="h-8 w-8 p-0 text-destructive shrink-0 self-start">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-6 text-center text-muted-foreground text-sm">Hali savollar yo'q</div>
                                )}

                                {/* Add question button / form */}
                                {addingTo === stage.id ? (
                                    <div className="border-t border-border p-4 space-y-4 bg-muted/10">
                                        <h4 className="font-medium text-sm">➕ Yangi savol (#{stage.questionCount + 1})</h4>

                                        <div className="grid gap-3 sm:grid-cols-3">
                                            <div>
                                                <label className="text-xs font-medium">Qiyinlik</label>
                                                <select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={qForm.difficulty} onChange={(e) => setQForm((f) => ({ ...f, difficulty: e.target.value }))}>
                                                    {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFF_LABEL[d]}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium">Max plays</label>
                                                <Input type="number" className="mt-1" value={qForm.maxPlays} onChange={(e) => setQForm((f) => ({ ...f, maxPlays: Number(e.target.value) }))} min={1} max={5} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium">To'g'ri javob</label>
                                                <select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={qForm.correctIndex} onChange={(e) => setQForm((f) => ({ ...f, correctIndex: Number(e.target.value) }))}>
                                                    {[0, 1, 2, 3].map((i) => <option key={i} value={i}>Variant {String.fromCharCode(65 + i)}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-medium">Savol matni (عربي)</label>
                                            <textarea dir="rtl" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px]" value={qForm.prompt} onChange={(e) => setQForm((f) => ({ ...f, prompt: e.target.value }))} placeholder="اكتب السؤال هنا..." />
                                        </div>

                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {qForm.options.map((opt, i) => (
                                                <div key={i}>
                                                    <label className="text-xs font-medium">
                                                        Variant {String.fromCharCode(65 + i)} {i === qForm.correctIndex && <span className="text-emerald-600">✓</span>}
                                                    </label>
                                                    <Input
                                                        dir="rtl"
                                                        className={i === qForm.correctIndex ? "mt-1 border-emerald-500 ring-1 ring-emerald-200" : "mt-1"}
                                                        value={opt}
                                                        onChange={(e) => {
                                                            const opts = [...qForm.options]; opts[i] = e.target.value;
                                                            setQForm((f) => ({ ...f, options: opts }));
                                                        }}
                                                        placeholder={`خيار ${String.fromCharCode(65 + i)}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        {/* Audio upload */}
                                        <div>
                                            <label className="text-xs font-medium flex items-center gap-1"><Upload className="h-3.5 w-3.5" /> Audio fayl (MP3)</label>
                                            <div className="mt-1 flex items-center gap-3">
                                                <input
                                                    type="file"
                                                    accept="audio/*"
                                                    className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) setQForm((f) => ({ ...f, audioFile: file, audioUrl: "" }));
                                                    }}
                                                />
                                                {qForm.audioFile && (
                                                    <span className="text-xs text-muted-foreground">{qForm.audioFile.name}</span>
                                                )}
                                            </div>
                                            {/* Or enter URL */}
                                            <div className="mt-2">
                                                <label className="text-xs text-muted-foreground">yoki URL kiriting:</label>
                                                <Input className="mt-1" value={qForm.audioUrl} onChange={(e) => setQForm((f) => ({ ...f, audioUrl: e.target.value, audioFile: undefined }))} placeholder="/api/uploads/audio/..." />
                                            </div>
                                        </div>

                                        <div className="flex gap-2 justify-end">
                                            <Button variant="ghost" size="sm" onClick={() => { setAddingTo(null); setQForm(emptyQForm()); }} className="gap-1 rounded-lg"><X className="h-3.5 w-3.5" /> Bekor</Button>
                                            <Button size="sm" onClick={addQuestion} disabled={saving} className="gap-1 rounded-lg"><Save className="h-3.5 w-3.5" /> {saving ? "Yuklanmoqda..." : "Saqlash"}</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border-t border-border p-3">
                                        <Button
                                            variant="outline" size="sm"
                                            className="w-full gap-2 rounded-lg border-dashed"
                                            onClick={() => {
                                                setAddingTo(stage.id);
                                                setQForm(emptyQForm());
                                            }}
                                        >
                                            <Plus className="h-4 w-4" /> Savol qo'shish ({stage.questionCount} ta mavjud)
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {stages.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <Headphones className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>Stage'lar topilmadi. Seed scriptni ishga tushiring:</p>
                        <code className="text-xs mt-2 block">npx prisma db seed</code>
                    </div>
                )}
            </div>
        </div>
    );
}
