import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/PageHeader";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Headphones,
  BookOpen,
  Languages,
  Upload,
} from "lucide-react";

const API_BASE = "/api";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const SECTIONS = [
  { value: "listening", label: "Eshitish", icon: Headphones },
  { value: "reading", label: "O'qib tushunish", icon: BookOpen },
  { value: "language_use", label: "Til qo'llanmasi", icon: Languages },
] as const;

type QuestionBankItem = {
  id: string;
  level: string;
  section: string;
  taskType: string;
  prompt: string;
  options: unknown;
  correctAnswer: unknown;
  transcript: string | null;
  passage: string | null;
  audioUrl: string | null;
  rubric: unknown;
  difficulty: number;
  tags: unknown;
  createdAt: string;
  updatedAt: string;
};

type ListResponse = {
  items: QuestionBankItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function optionsToLines(options: unknown): string {
  if (options == null) return "";
  if (Array.isArray(options)) return (options as string[]).join("\n");
  if (typeof options === "string") return options;
  return String(options);
}

function linesToOptions(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

const emptyForm = {
  level: "A1",
  section: "listening",
  taskType: "mcq",
  prompt: "",
  optionsText: "",
  correctAnswer: "",
  transcript: "",
  passage: "",
  audioUrl: "",
  difficulty: 3,
};

export function AdminQuestionBank() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [levelFilter, setLevelFilter] = useState<string>("");
  const [sectionFilter, setSectionFilter] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioUploadError, setAudioUploadError] = useState<string | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  const queryParams = new URLSearchParams();
  if (levelFilter) queryParams.set("level", levelFilter);
  if (sectionFilter) queryParams.set("section", sectionFilter);
  queryParams.set("page", String(page));
  queryParams.set("pageSize", "20");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-question-bank", levelFilter, sectionFilter, page],
    queryFn: () => api<ListResponse>(`/admin/question-bank?${queryParams}`),
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<QuestionBankItem>("/admin/question-bank", { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-question-bank"] });
      setModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api<QuestionBankItem>(`/admin/question-bank/${id}`, { method: "PUT", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-question-bank"] });
      setModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/admin/question-bank/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-question-bank"] });
      setDeleteConfirm(null);
    },
  });

  const openCreate = useCallback(() => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
    setAudioUploadError(null);
  }, []);

  const uploadAudio = useCallback(async (file: File) => {
    setAudioUploadError(null);
    setAudioUploading(true);
    try {
      const token = useAuthStore.getState().accessToken;
      const formData = new FormData();
      formData.append("audio", file);
      const res = await fetch(`${API_BASE}/admin/upload-audio`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || "Yuklash muvaffaqiyatsiz");
      }
      const data = (await res.json()) as { audioUrl: string };
      setForm((f) => ({ ...f, audioUrl: data.audioUrl }));
    } catch (e) {
      setAudioUploadError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setAudioUploading(false);
      if (audioFileInputRef.current) audioFileInputRef.current.value = "";
    }
  }, []);

  const openEdit = useCallback((item: QuestionBankItem) => {
    setForm({
      level: item.level,
      section: item.section,
      taskType: item.taskType || "mcq",
      prompt: item.prompt,
      optionsText: optionsToLines(item.options),
      correctAnswer:
        typeof item.correctAnswer === "string"
          ? item.correctAnswer
          : JSON.stringify(item.correctAnswer ?? ""),
      transcript: item.transcript ?? "",
      passage: item.passage ?? "",
      audioUrl: item.audioUrl ?? "",
      difficulty: item.difficulty ?? 3,
    });
    setEditingId(item.id);
    setModalOpen(true);
    setAudioUploadError(null);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const options = linesToOptions(form.optionsText);
    const body: Record<string, unknown> = {
      level: form.level,
      section: form.section,
      taskType: form.taskType,
      prompt: form.prompt,
      correctAnswer: form.correctAnswer.trim() || (options.length ? options[0] : ""),
      difficulty: form.difficulty,
    };
    if (options.length) body.options = options;
    if (form.section === "listening" || form.transcript) body.transcript = form.transcript || null;
    if (form.section === "reading" || form.passage) body.passage = form.passage || null;
    if (form.audioUrl) body.audioUrl = form.audioUrl || null;

    if (editingId) {
      updateMutation.mutate({ id: editingId, body });
    } else {
      createMutation.mutate(body);
    }
  };

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;
  const sectionLabel = (s: string) => SECTIONS.find((x) => x.value === s)?.label ?? s;

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <PageHeader
        title="Imtihon topshiriqlari"
        subtitle="Eshitish va o'qib tushunish bo'limlari shu bankdagi topshiriqlar asosida bo'ladi. CEFR darajasi bo'yicha filtrlash."
        action={
          <Button className="rounded-xl gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Yangi topshiriq
          </Button>
        }
      />

      <Card className="rounded-xl border-border shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap gap-3 items-center">
            <CardTitle className="text-base">Savol banki</CardTitle>
            <select
              value={levelFilter}
              onChange={(e) => {
                setLevelFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Barcha darajalar</option>
              {CEFR_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <select
              value={sectionFilter}
              onChange={(e) => {
                setSectionFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Barcha bo'limlar</option>
              {SECTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Yuklanmoqda…</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-3 font-medium">Daraja</th>
                      <th className="text-left p-3 font-medium">Bo'lim</th>
                      <th className="text-left p-3 font-medium">Savol (qisqa)</th>
                      <th className="text-left p-3 font-medium">Matn / Audio</th>
                      <th className="text-left p-3 w-24">Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          Topshiriqlar topilmadi. Filterni o'zgartiring yoki "Yangi topshiriq" orqali qo'shing.
                        </td>
                      </tr>
                    ) : (
                      items.map((q) => (
                        <tr
                          key={q.id}
                          className="border-b border-border hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-3 font-medium">{q.level}</td>
                          <td className="p-3">{sectionLabel(q.section)}</td>
                          <td className="p-3 max-w-[200px] truncate" title={q.prompt}>
                            {q.prompt.slice(0, 60)}
                            {q.prompt.length > 60 ? "…" : ""}
                          </td>
                          <td className="p-3 max-w-[180px] text-muted-foreground">
                            {q.section === "listening" && (q.transcript ? "Transkript bor" : "—")}
                            {q.section === "reading" && (q.passage ? "Matn bor" : "—")}
                            {q.section === "language_use" && "—"}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => openEdit(q)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {deleteConfirm === q.id ? (
                                <>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => deleteMutation.mutate(q.id)}
                                    disabled={deleteMutation.isPending}
                                  >
                                    Ha
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => setDeleteConfirm(null)}
                                  >
                                    Yo'q
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteConfirm(q.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Jami: {data?.total ?? 0} · Sahifa {data?.page ?? 1} / {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !createMutation.isPending && !updateMutation.isPending && setModalOpen(false)}
        >
          <Card
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>{editingId ? "Topshiriqni tahrirlash" : "Yangi topshiriq"}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setModalOpen(false)}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                ✕
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">CEFR darajasi</label>
                    <select
                      value={form.level}
                      onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      required
                    >
                      {CEFR_LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Bo'lim</label>
                    <select
                      value={form.section}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, section: e.target.value }))
                      }
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      required
                    >
                      {SECTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Savol matni (prompt)</label>
                  <textarea
                    value={form.prompt}
                    onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Savol yoki topshiriq matni..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Variantlar (har biri yangi qatorda)
                  </label>
                  <textarea
                    value={form.optionsText}
                    onChange={(e) => setForm((f) => ({ ...f, optionsText: e.target.value }))}
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                    placeholder="A) Birinchi javob&#10;B) Ikkinchi javob&#10;C) Uchinchi javob"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">To'g'ri javob (belgi yoki matn)</label>
                  <input
                    type="text"
                    value={form.correctAnswer}
                    onChange={(e) => setForm((f) => ({ ...f, correctAnswer: e.target.value }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    placeholder="A yoki to'liq javob matni"
                  />
                </div>

                {(form.section === "listening" || form.transcript) && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Transkript (eshitish uchun – audio matni)
                    </label>
                    <textarea
                      value={form.transcript}
                      onChange={(e) => setForm((f) => ({ ...f, transcript: e.target.value }))}
                      className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Eshitiladigan matn..."
                    />
                  </div>
                )}

                {(form.section === "reading" || form.passage) && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      O'qish matni (passage)
                    </label>
                    <textarea
                      value={form.passage}
                      onChange={(e) => setForm((f) => ({ ...f, passage: e.target.value }))}
                      className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="O'qiladigan matn..."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Audio URL (ixtiyoriy, eshitish uchun)
                  </label>
                  <div className="flex gap-2 items-center flex-wrap">
                    <input
                      type="url"
                      value={form.audioUrl}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, audioUrl: e.target.value }));
                        setAudioUploadError(null);
                      }}
                      className="h-10 flex-1 min-w-[200px] rounded-md border border-input bg-background px-3 text-sm"
                      placeholder="https://... yoki Fayl yuklash"
                    />
                    <input
                      ref={audioFileInputRef}
                      type="file"
                      accept="audio/*"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadAudio(file);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 shrink-0"
                      disabled={audioUploading}
                      onClick={() => audioFileInputRef.current?.click()}
                    >
                      {audioUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {audioUploading ? "Yuklanmoqda…" : "Fayl yuklash"}
                    </Button>
                  </div>
                  {audioUploadError && (
                    <p className="text-sm text-destructive mt-1">{audioUploadError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Qiyinlik (1–5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={form.difficulty}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, difficulty: parseInt(e.target.value, 10) || 3 }))
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm max-w-[80px]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="submit"
                    className="rounded-xl gap-2"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {editingId ? "Saqlash" : "Qo'shish"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModalOpen(false)}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    Bekor qilish
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </motion.div>
  );
}
