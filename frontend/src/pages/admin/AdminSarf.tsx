import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/app/PageHeader";
import { api } from "@/lib/api";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";

// ── Tiplar ──────────────────────────────────────────────────

interface SarfLessonAdmin {
  id: string;
  slug: string;
  order: number;
  level: string;
  titleUz: string;
  titleAr: string;
  summary: string;
  estMinutes: number;
  isFree: boolean;
  theory: string; // JSON matn (list endpoint parse qilmaydi)
  conjugationTables: string; // JSON matn
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { questions: number };
}

interface SarfLessonsResponse {
  lessons: SarfLessonAdmin[];
}

interface SarfQuestionAdmin {
  id: string;
  lessonId: string;
  orderIndex: number;
  prompt: string;
  options: string[]; // detail endpoint parse qilingan holda qaytaradi
  correctIndex: number;
  explanation: string;
  createdAt: string;
}

interface SarfLessonDetailAdmin extends Omit<SarfLessonAdmin, "theory" | "conjugationTables" | "_count"> {
  theory: unknown;
  conjugationTables: unknown;
  questions: SarfQuestionAdmin[];
}

// ── Dars formasi ────────────────────────────────────────────

interface LessonForm {
  slug: string;
  order: number;
  level: string;
  titleUz: string;
  titleAr: string;
  summary: string;
  estMinutes: number;
  isFree: boolean;
  isPublished: boolean;
  theoryText: string;
  conjTablesText: string;
}

const emptyLessonForm = (): LessonForm => ({
  slug: "",
  order: 0,
  level: "A1",
  titleUz: "",
  titleAr: "",
  summary: "",
  estMinutes: 10,
  isFree: false,
  isPublished: true,
  theoryText: "[]",
  conjTablesText: "[]",
});

function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

// ── Savol formasi ───────────────────────────────────────────

interface QForm {
  orderIndex: number;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const emptyQForm = (orderIndex = 1): QForm => ({
  orderIndex,
  prompt: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  explanation: "",
});

export function AdminSarf() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-sarf-lessons"],
    queryFn: () => api<SarfLessonsResponse>("/admin/sarf/lessons"),
  });
  const lessons = data?.lessons ?? [];

  const refreshLessons = () => queryClient.invalidateQueries({ queryKey: ["admin-sarf-lessons"] });

  // Dars tahrirlash/yaratish
  const [editingLesson, setEditingLesson] = useState<string | null>(null); // id yoki "new"
  const [lessonForm, setLessonForm] = useState<LessonForm>(emptyLessonForm());

  const openNewLesson = () => {
    setLessonForm(emptyLessonForm());
    setEditingLesson("new");
  };

  const openEditLesson = (l: SarfLessonAdmin) => {
    setLessonForm({
      slug: l.slug,
      order: l.order,
      level: l.level,
      titleUz: l.titleUz,
      titleAr: l.titleAr,
      summary: l.summary,
      estMinutes: l.estMinutes,
      isFree: l.isFree,
      isPublished: l.isPublished,
      theoryText: prettyJson(l.theory),
      conjTablesText: prettyJson(l.conjugationTables),
    });
    setEditingLesson(l.id);
  };

  const saveLessonMutation = useMutation({
    mutationFn: ({ id, body }: { id: string | null; body: Record<string, unknown> }) =>
      id ? api(`/admin/sarf/lessons/${id}`, { method: "PUT", body }) : api("/admin/sarf/lessons", { method: "POST", body }),
    onSuccess: () => {
      toast.success("Dars saqlandi");
      setEditingLesson(null);
      refreshLessons();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Saqlab bo'lmadi"),
  });

  const saveLesson = () => {
    if (!lessonForm.slug.trim() || !lessonForm.titleUz.trim() || !lessonForm.titleAr.trim() || !lessonForm.summary.trim()) {
      toast.error("Slug, sarlavhalar va tavsif to'ldirilishi shart");
      return;
    }
    let theory: unknown;
    let conjugationTables: unknown;
    try {
      theory = JSON.parse(lessonForm.theoryText);
    } catch {
      toast.error("Theory maydoni to'g'ri JSON emas");
      return;
    }
    try {
      conjugationTables = JSON.parse(lessonForm.conjTablesText);
    } catch {
      toast.error("Conjugation Tables maydoni to'g'ri JSON emas");
      return;
    }
    const body = {
      slug: lessonForm.slug.trim(),
      order: Number(lessonForm.order),
      level: lessonForm.level,
      titleUz: lessonForm.titleUz,
      titleAr: lessonForm.titleAr,
      summary: lessonForm.summary,
      estMinutes: Number(lessonForm.estMinutes),
      isFree: lessonForm.isFree,
      isPublished: lessonForm.isPublished,
      theory,
      conjugationTables,
    };
    saveLessonMutation.mutate({ id: editingLesson === "new" ? null : editingLesson, body });
  };

  const deleteLessonMutation = useMutation({
    mutationFn: (id: string) => api(`/admin/sarf/lessons/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Dars o'chirildi");
      refreshLessons();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "O'chirib bo'lmadi"),
  });

  const removeLesson = (id: string) => {
    if (!confirm("Darsni va unga tegishli barcha savollarni o'chirmoqchimisiz?")) return;
    deleteLessonMutation.mutate(id);
  };

  // Kengaytirilgan qator (savollarni boshqarish)
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [qEditing, setQEditing] = useState<string | null>(null); // question id yoki "new"
  const [qForm, setQForm] = useState<QForm>(emptyQForm());

  const detailQuery = useQuery({
    queryKey: ["admin-sarf-lesson", expandedId],
    queryFn: () => api<SarfLessonDetailAdmin>(`/admin/sarf/lessons/${expandedId}`),
    enabled: !!expandedId,
  });

  const toggleExpand = (id: string) => {
    setQEditing(null);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const invalidateDetail = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-sarf-lesson", expandedId] });
    refreshLessons();
  };

  const openNewQuestion = () => {
    const count = detailQuery.data?.questions.length ?? 0;
    setQForm(emptyQForm(count + 1));
    setQEditing("new");
  };

  const openEditQuestion = (q: SarfQuestionAdmin) => {
    setQForm({
      orderIndex: q.orderIndex,
      prompt: q.prompt,
      options: [...q.options],
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    });
    setQEditing(q.id);
  };

  const createQuestionMutation = useMutation({
    mutationFn: ({ lessonId, body }: { lessonId: string; body: Record<string, unknown> }) =>
      api(`/admin/sarf/lessons/${lessonId}/questions`, { method: "POST", body }),
    onSuccess: () => {
      toast.success("Savol qo'shildi");
      setQEditing(null);
      invalidateDetail();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Qo'shib bo'lmadi"),
  });

  const updateQuestionMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api(`/admin/sarf/questions/${id}`, { method: "PUT", body }),
    onSuccess: () => {
      toast.success("Savol yangilandi");
      setQEditing(null);
      invalidateDetail();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Yangilab bo'lmadi"),
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (id: string) => api(`/admin/sarf/questions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Savol o'chirildi");
      invalidateDetail();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "O'chirib bo'lmadi"),
  });

  const removeQuestion = (id: string) => {
    if (!confirm("Savolni o'chirmoqchimisiz?")) return;
    deleteQuestionMutation.mutate(id);
  };

  const saveQuestion = (lessonId: string) => {
    if (!qForm.prompt.trim() || qForm.options.some((o) => !o.trim()) || !qForm.explanation.trim()) {
      toast.error("Savol matni, barcha 4 variant va izoh to'ldirilishi shart");
      return;
    }
    if (qForm.correctIndex < 0 || qForm.correctIndex > 3) {
      toast.error("To'g'ri javob indeksi 0..3 oralig'ida bo'lishi kerak");
      return;
    }
    const body = {
      orderIndex: Number(qForm.orderIndex),
      prompt: qForm.prompt,
      options: qForm.options,
      correctIndex: Number(qForm.correctIndex),
      explanation: qForm.explanation,
    };
    if (qEditing === "new") {
      createQuestionMutation.mutate({ lessonId, body });
    } else if (qEditing) {
      updateQuestionMutation.mutate({ id: qEditing, body });
    }
  };

  const qBusy = createQuestionMutation.isPending || updateQuestionMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <PageHeader
        title="Sarf asoslari"
        subtitle={`Jami: ${lessons.length} ta dars`}
        action={
          <Button onClick={openNewLesson} className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" /> Yangi dars
          </Button>
        }
      />

      {/* Dars forma */}
      {editingLesson && (
        <div className="rounded-xl border border-primary/30 bg-card p-5 shadow-md space-y-4">
          <h3 className="font-semibold">{editingLesson === "new" ? "➕ Yangi dars" : "✏️ Darsni tahrirlash"}</h3>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Slug</label>
              <Input
                className="mt-1"
                value={lessonForm.slug}
                onChange={(e) => setLessonForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="sarf-kirish"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tartib (order)</label>
              <Input
                type="number"
                className="mt-1"
                value={lessonForm.order}
                onChange={(e) => setLessonForm((f) => ({ ...f, order: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Daraja (level)</label>
              <Input
                className="mt-1"
                value={lessonForm.level}
                onChange={(e) => setLessonForm((f) => ({ ...f, level: e.target.value }))}
                placeholder="A1 yoki A1/A2"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Sarlavha (o'zbekcha)</label>
              <Input
                className="mt-1"
                value={lessonForm.titleUz}
                onChange={(e) => setLessonForm((f) => ({ ...f, titleUz: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Sarlavha (arabcha)</label>
              <Input
                dir="rtl"
                className="mt-1"
                value={lessonForm.titleAr}
                onChange={(e) => setLessonForm((f) => ({ ...f, titleAr: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Tavsif (summary)</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
              value={lessonForm.summary}
              onChange={(e) => setLessonForm((f) => ({ ...f, summary: e.target.value }))}
              placeholder="Ro'yxat kartochkasida ko'rinadigan 1-2 gapli tavsif"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3 items-end">
            <div>
              <label className="text-sm font-medium">Taxminiy vaqt (daqiqa)</label>
              <Input
                type="number"
                className="mt-1"
                value={lessonForm.estMinutes}
                onChange={(e) => setLessonForm((f) => ({ ...f, estMinutes: Number(e.target.value) }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={lessonForm.isFree}
                onChange={(e) => setLessonForm((f) => ({ ...f, isFree: e.target.checked }))}
                className="h-4 w-4 rounded border-input"
              />
              Bepul (isFree)
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={lessonForm.isPublished}
                onChange={(e) => setLessonForm((f) => ({ ...f, isPublished: e.target.checked }))}
                className="h-4 w-4 rounded border-input"
              />
              Chop etilgan (isPublished)
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Theory (JSON: Block[])
              </label>
              <textarea
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono min-h-[180px]"
                value={lessonForm.theoryText}
                onChange={(e) => setLessonForm((f) => ({ ...f, theoryText: e.target.value }))}
                spellCheck={false}
              />
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Conjugation Tables (JSON: ConjTable[])
              </label>
              <textarea
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono min-h-[180px]"
                value={lessonForm.conjTablesText}
                onChange={(e) => setLessonForm((f) => ({ ...f, conjTablesText: e.target.value }))}
                spellCheck={false}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setEditingLesson(null)} className="gap-2 rounded-xl">
              <X className="h-4 w-4" /> Bekor
            </Button>
            <Button onClick={saveLesson} disabled={saveLessonMutation.isPending} className="gap-2 rounded-xl">
              <Save className="h-4 w-4" /> {saveLessonMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        </div>
      )}

      {/* Darslar jadvali */}
      <Card className="rounded-xl border-border shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Darslar ro'yxati</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium">#</th>
                  <th className="text-left p-3 font-medium">Sarlavha</th>
                  <th className="text-left p-3 font-medium">Daraja</th>
                  <th className="text-left p-3 font-medium">Tarif</th>
                  <th className="text-left p-3 font-medium">Holat</th>
                  <th className="text-left p-3 font-medium">Savollar</th>
                  <th className="text-right p-3 font-medium">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((l) => (
                  <>
                    <tr
                      key={l.id}
                      className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(l.id)}
                    >
                      <td className="p-3 text-muted-foreground">{l.order}</td>
                      <td className="p-3">
                        <div className="font-medium">{l.titleUz}</div>
                        <div className="text-xs text-muted-foreground" dir="rtl">
                          {l.titleAr}
                        </div>
                      </td>
                      <td className="p-3">{l.level}</td>
                      <td className="p-3">
                        {l.isFree ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                            <Unlock className="h-3 w-3" /> Bepul
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            <Lock className="h-3 w-3" /> Pro
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {l.isPublished ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
                            <Eye className="h-3 w-3" /> Chop etilgan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                            <EyeOff className="h-3 w-3" /> Qoralama
                          </span>
                        )}
                      </td>
                      <td className="p-3">{l._count.questions}</td>
                      <td className="p-3">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditLesson(l);
                            }}
                            className="h-8 w-8 p-0 rounded-lg"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeLesson(l.id);
                            }}
                            className="h-8 w-8 p-0 rounded-lg text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => toggleExpand(l.id)} className="h-8 w-8 p-0 rounded-lg">
                            {expandedId === l.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === l.id && (
                      <tr>
                        <td colSpan={7} className="border-b border-border bg-muted/10 p-4">
                          {detailQuery.isLoading ? (
                            <div className="flex justify-center py-6">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium">Savollar ({detailQuery.data?.questions.length ?? 0} ta)</h4>
                                <Button size="sm" onClick={openNewQuestion} className="gap-2 rounded-lg">
                                  <Plus className="h-3.5 w-3.5" /> Savol qo'shish
                                </Button>
                              </div>

                              {(qEditing === "new" || (qEditing && detailQuery.data?.questions.some((q) => q.id === qEditing))) && (
                                <div className="rounded-lg border border-primary/30 bg-card p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{qEditing === "new" ? "Yangi savol" : "Savolni tahrirlash"}</span>
                                    <div className="flex items-center gap-2">
                                      <label className="text-xs text-muted-foreground">Tartib</label>
                                      <Input
                                        type="number"
                                        className="h-7 w-16 text-xs"
                                        value={qForm.orderIndex}
                                        onChange={(e) => setQForm((f) => ({ ...f, orderIndex: Number(e.target.value) }))}
                                      />
                                      <select
                                        className="rounded border border-input bg-background px-2 py-1 text-xs"
                                        value={qForm.correctIndex}
                                        onChange={(e) => setQForm((f) => ({ ...f, correctIndex: Number(e.target.value) }))}
                                      >
                                        {[0, 1, 2, 3].map((i) => (
                                          <option key={i} value={i}>
                                            To'g'ri: {String.fromCharCode(65 + i)}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                  <textarea
                                    dir="rtl"
                                    className="w-full rounded border border-input bg-background px-3 py-1.5 text-sm"
                                    value={qForm.prompt}
                                    onChange={(e) => setQForm((f) => ({ ...f, prompt: e.target.value }))}
                                    placeholder="Savol matni..."
                                    rows={2}
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                    {qForm.options.map((opt, oi) => (
                                      <Input
                                        key={oi}
                                        dir="rtl"
                                        value={opt}
                                        onChange={(e) => {
                                          const opts = [...qForm.options];
                                          opts[oi] = e.target.value;
                                          setQForm((f) => ({ ...f, options: opts }));
                                        }}
                                        placeholder={`Variant ${String.fromCharCode(65 + oi)}`}
                                        className={oi === qForm.correctIndex ? "border-emerald-500 ring-1 ring-emerald-200" : ""}
                                      />
                                    ))}
                                  </div>
                                  <textarea
                                    className="w-full rounded border border-input bg-background px-3 py-1.5 text-sm"
                                    value={qForm.explanation}
                                    onChange={(e) => setQForm((f) => ({ ...f, explanation: e.target.value }))}
                                    placeholder="To'g'ri javob izohi (o'zbekcha)..."
                                    rows={2}
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <Button variant="ghost" size="sm" onClick={() => setQEditing(null)} className="gap-2 rounded-lg">
                                      <X className="h-3.5 w-3.5" /> Bekor
                                    </Button>
                                    <Button size="sm" disabled={qBusy} onClick={() => saveQuestion(l.id)} className="gap-2 rounded-lg">
                                      <Save className="h-3.5 w-3.5" /> {qBusy ? "Saqlanmoqda..." : "Saqlash"}
                                    </Button>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-1">
                                {detailQuery.data?.questions.map((q, i) => (
                                  <div key={q.id} className="flex items-start justify-between gap-2 text-sm pl-3 border-l-2 border-primary/20 py-1.5">
                                    <div>
                                      <span className="text-muted-foreground">{i + 1}.</span>{" "}
                                      <span dir="rtl">{q.prompt}</span>
                                      <span className="text-emerald-600 ml-2 text-xs">({q.options[q.correctIndex]})</span>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                      <Button variant="ghost" size="sm" onClick={() => openEditQuestion(q)} className="h-7 w-7 p-0 rounded-lg">
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeQuestion(q.id)}
                                        className="h-7 w-7 p-0 rounded-lg text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                                {detailQuery.data?.questions.length === 0 && (
                                  <p className="text-center text-muted-foreground py-4 text-sm">Hali savollar yo'q</p>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {lessons.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Hali darslar yo'q
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
