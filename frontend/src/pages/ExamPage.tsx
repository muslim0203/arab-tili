import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Loader2, Clock, Mic, Square, Upload, AlertTriangle, RotateCcw, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Question = {
  id: string;
  order: number;
  questionText: string;
  questionType: string;
  options?: string[];
  points: number;
  maxScore?: number;
  section?: string;
  taskType?: string;
  transcript?: string | null;
  passage?: string | null;
  audioUrl?: string | null;
  wordLimit?: number | null;
};

type AttemptData = {
  attemptId: string;
  status: string;
  startedAt: string;
  level?: string | null;
  exam: { id: string; title: string; durationMinutes: number } | null;
  questions: Question[];
  answers: Record<string, { answerText: string | null; audioUrl?: string | null }>;
  useAttemptQuestionId?: boolean;
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const SECTION_LABELS: Record<string, string> = {
  listening: "Tinglash",
  reading: "O‘qish",
  language_use: "Til bilimi",
  writing: "Yozish",
  speaking: "Gapirish",
};

const MAX_LISTENING_PLAYS = 2;

function fullAudioUrl(audioUrl: string | null | undefined): string {
  if (!audioUrl) return "";
  if (audioUrl.startsWith("http://") || audioUrl.startsWith("https://")) return audioUrl;
  // Audio fayllar backend (Railway) serverda saqlangan
  // VITE_API_URL = "https://arab-exam-api-production.up.railway.app/api"
  // audioUrl = "/api/uploads/audio/filename.mp3"
  const apiBase = import.meta.env.VITE_API_URL || "/api";
  // Extract backend origin from VITE_API_URL (remove trailing /api)
  const backendOrigin = apiBase.replace(/\/api\/?$/, "");
  if (backendOrigin && backendOrigin.startsWith("http")) {
    return `${backendOrigin}${audioUrl.startsWith("/") ? "" : "/"}${audioUrl}`;
  }
  // Fallback: same origin (local dev)
  return audioUrl;
}

type SaveState = "idle" | "saving" | "saved" | "error";

const SAVE_DEBOUNCE_MS = 1000;

export function ExamPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: () => api<AttemptData>(`/attempts/${attemptId}`),
    enabled: !!attemptId,
  });

  const questions = data?.questions ?? [];
  const question = questions[currentIndex];
  const answers = data?.answers ?? {};
  const selected = question ? (answers[question.id]?.answerText ?? null) : null;
  const speakingAudioUrl = question ? (answers[question.id]?.audioUrl ?? null) : null;

  const useAttemptQuestionId = !!data?.useAttemptQuestionId;
  const updateAnswerInCache = useCallback(
    (questionId: string, patch: { answerText?: string | null; audioUrl?: string | null }) => {
      if (!attemptId) return;
      queryClient.setQueryData(["attempt", attemptId], (old: AttemptData | undefined) => {
        if (!old) return old;
        const prev = old.answers[questionId] ?? { answerText: null };
        return {
          ...old,
          answers: { ...old.answers, [questionId]: { ...prev, ...patch } },
        };
      });
    },
    [attemptId, queryClient]
  );

  // Tarmoq PUT — xato yuzaga kelsa yuqoriga uzatiladi (chaqiruvchi ushlaydi)
  const putAnswer = useCallback(
    async (questionId: string, answerText: string) => {
      if (!attemptId) throw new Error("Attempt topilmadi");
      await api(`/attempts/${attemptId}/answer`, {
        method: "PUT",
        body: useAttemptQuestionId
          ? { attemptQuestionId: questionId, answerText }
          : { questionId, answerText },
      });
    },
    [attemptId, useAttemptQuestionId]
  );

  // ── MCQ: darhol cache yangilanadi, tarmoq xatosi toast bilan ko'rsatiladi ──
  const handleMcqSelect = useCallback(
    (questionId: string, opt: string) => {
      updateAnswerInCache(questionId, { answerText: opt });
      putAnswer(questionId, opt).catch(() => {
        toast.error("Javob saqlanmadi, internetni tekshiring");
      });
    },
    [updateAnswerInCache, putAnswer]
  );

  // ── Writing/Speaking matni: darhol UI, tarmoq PUT debounce bilan ──
  const pendingSaveRef = useRef<{ questionId: string; text: string } | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPendingSave = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const pending = pendingSaveRef.current;
    if (!pending) return;
    pendingSaveRef.current = null;
    setSaveState("saving");
    try {
      await putAnswer(pending.questionId, pending.text);
      setSaveState("saved");
    } catch {
      setSaveState("error");
      toast.error("Javob saqlanmadi, internetni tekshiring");
    }
  }, [putAnswer]);

  const handleTextChange = useCallback(
    (questionId: string, text: string) => {
      updateAnswerInCache(questionId, { answerText: text });
      pendingSaveRef.current = { questionId, text };
      setSaveState("saving");
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        void flushPendingSave();
      }, SAVE_DEBOUNCE_MS);
    },
    [updateAnswerInCache, flushPendingSave]
  );

  // Savol almashganda yoki sahifadan chiqishda kutilayotgan saqlashni flush qilamiz
  useEffect(() => {
    return () => {
      void flushPendingSave();
    };
  }, [currentIndex, flushPendingSave]);

  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "uploading">("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const listeningAudioRef = useRef<HTMLAudioElement>(null);
  const [listeningPlaysUsed, setListeningPlaysUsed] = useState<Record<string, number>>({});
  const uploadSpeakingAudio = useCallback(
    async (attemptQuestionId: string, file: Blob) => {
      if (!attemptId) return;
      setRecordingState("uploading");
      try {
        const formData = new FormData();
        formData.append("audio", file, "recording.webm");
        formData.append("attemptQuestionId", attemptQuestionId);
        const token = useAuthStore.getState().accessToken;
        const apiBase = import.meta.env.VITE_API_URL || "/api";
        const res = await fetch(`${apiBase}/attempts/${attemptId}/speaking-audio`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: res.statusText }));
          throw new Error(err.message || "Audio yuklanmadi");
        }
        const resData = (await res.json()) as { audioUrl: string };
        updateAnswerInCache(attemptQuestionId, { answerText: "[Audio yuklandi]", audioUrl: resData.audioUrl });
        setRecordingState("idle");
      } catch (e) {
        setRecordingState("idle");
        throw e;
      }
    },
    [attemptId, updateAnswerInCache]
  );
  const startRecording = useCallback(() => {
    if (!question || question.section !== "speaking") return;
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const mr = new MediaRecorder(stream);
        mediaRecorderRef.current = mr;
        const chunks: BlobPart[] = [];
        mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        mr.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunks, { type: "audio/webm" });
          uploadSpeakingAudio(question.id, blob).catch((e) => {
            toast.error(
              e instanceof Error ? e.message : "Audio yuklanmadi. Qayta urinib ko‘ring."
            );
          });
        };
        mr.start();
        setRecordingState("recording");
      })
      .catch((err: unknown) => {
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          toast.error("Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan mikrofon ruxsatini bering.");
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          toast.error("Mikrofon topilmadi. Qurilmangizga mikrofon ulanganligini tekshiring.");
        } else {
          toast.error("Mikrofonni ishga tushirib bo‘lmadi. Qayta urinib ko‘ring.");
        }
      });
  }, [question, uploadSpeakingAudio]);
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, [recordingState]);

  useEffect(() => {
    if (!data?.startedAt) return;
    const duration = data.exam?.durationMinutes ?? 120;
    if (!duration) return;
    const started = new Date(data.startedAt).getTime();
    const totalSeconds = duration * 60;
    const elapsed = Math.floor((Date.now() - started) / 1000);
    const left = Math.max(0, totalSeconds - elapsed);
    setTimeLeft(left);
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev == null || prev <= 1) {
          clearInterval(t);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [data?.exam?.durationMinutes, data?.startedAt]);

  const submittingRef = useRef(false);
  const handleSubmit = useCallback(
    async (auto = false) => {
      if (!attemptId || !data || submittingRef.current) return;
      if (data.status === "COMPLETED") return;
      if (!auto && !window.confirm("Imtihonni yakunlashni xohlaysizmi?")) return;
      submittingRef.current = true;
      setIsSubmitting(true);
      try {
        // Kutilayotgan writing/speaking saqlashini yo'qotmaslik uchun avval flush
        await flushPendingSave();
        const allQuestions = data.questions;
        const allAnswers = data.answers;
        const listening = allQuestions.filter((q) => q.section === "listening");
        const reading = allQuestions.filter((q) => q.section === "reading");
        const language = allQuestions.filter((q) => q.section === "language_use");
        const writing = allQuestions.filter((q) => q.section === "writing");
        const speaking = allQuestions.filter((q) => q.section === "speaking");
        const bankQuestions = [...listening, ...reading, ...language];
        const body = {
          answers: bankQuestions.map((q) => ({
            attemptQuestionId: q.id,
            answer: (allAnswers[q.id]?.answerText ?? "").trim(),
          })),
          writing: writing.map((q) => ({
            taskId: q.id,
            text: (allAnswers[q.id]?.answerText ?? "").trim(),
          })),
          speaking: speaking.map((q) => {
            const a = allAnswers[q.id];
            const isAudio = a?.audioUrl || a?.answerText === "[Audio yuklandi]";
            return {
              taskId: q.id,
              text: isAudio ? undefined : (a?.answerText ?? "").trim(),
              audioUrl: a?.audioUrl,
            };
          }),
        };
        await api(`/attempts/${attemptId}/submit`, { method: "POST", body });
        if (auto) toast.info("Vaqt tugadi — imtihon avtomatik yakunlandi");
        navigate(`/attempts/${attemptId}/results`, { replace: true });
      } catch (e) {
        submittingRef.current = false;
        setIsSubmitting(false);
        toast.error(e instanceof Error ? e.message : "Imtihonni yakunlashda xatolik yuz berdi");
      }
    },
    [attemptId, data, flushPendingSave, navigate]
  );

  // Taymer ogohlantirishlari va vaqt tugaganda avto-yakunlash
  const handleSubmitRef = useRef(handleSubmit);
  handleSubmitRef.current = handleSubmit;
  const warnedRef = useRef({ five: false, one: false });
  useEffect(() => {
    if (timeLeft === null || !data || data.status === "COMPLETED") return;
    if (timeLeft > 0 && timeLeft <= 300 && !warnedRef.current.five) {
      warnedRef.current.five = true;
      if (timeLeft > 60) toast.warning("Diqqat: 5 daqiqadan kam vaqt qoldi");
    }
    if (timeLeft > 0 && timeLeft <= 60 && !warnedRef.current.one) {
      warnedRef.current.one = true;
      toast.warning("Diqqat: 1 daqiqadan kam vaqt qoldi");
    }
    if (timeLeft === 0 && !submittingRef.current) {
      void handleSubmitRef.current(true);
    }
  }, [timeLeft, data]);

  // COMPLETED bo'lsa natijalarga yo'naltirish — render emas, effekt ichida
  useEffect(() => {
    if (data?.status === "COMPLETED" && attemptId) {
      navigate(`/attempts/${attemptId}/results`, { replace: true });
    }
  }, [data?.status, attemptId, navigate]);

  // ── Xato holati (loading'dan OLDIN tekshiriladi) ──
  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
              <CardTitle className="text-base">Imtihonni yuklab bo‘lmadi</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Noma’lum xatolik yuz berdi"}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => refetch()}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Qayta urinish
              </Button>
              <Button variant="outline" onClick={() => navigate(-1)}>
                Orqaga
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data.status === "COMPLETED") {
    // Effekt natijalar sahifasiga yo'naltiradi
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const examTitle = data.exam?.title ?? `CEFR ${data.level ?? ""}`;
  const isWriting = question?.section === "writing";
  const isSpeaking = question?.section === "speaking";
  const isMcq = !isWriting && !isSpeaking && Array.isArray(question?.options) && question.options.length > 0;
  const playsUsed = question ? (listeningPlaysUsed[question.id] ?? 0) : 0;
  const playsLeft = Math.max(0, MAX_LISTENING_PLAYS - playsUsed);

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <header className="sticky top-0 z-10 border-b bg-card">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <CardTitle className="text-base">{examTitle}</CardTitle>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className={cn("font-mono", timeLeft !== null && timeLeft < 300 && "text-destructive")}>
              {timeLeft !== null ? formatTime(timeLeft) : "—"}
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-6">
        {question?.section && (
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            {SECTION_LABELS[question.section] ?? question.section}
          </p>
        )}
        <div className="mb-4 flex flex-wrap gap-2">
          {questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "h-9 w-9 rounded-md border text-sm font-medium transition-colors",
                (answers[q.id]?.answerText ?? "").trim()
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-background hover:bg-accent",
                currentIndex === i && "ring-2 ring-primary"
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {question && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Savol {currentIndex + 1} / {questions.length}
              </CardTitle>
              {question.section === "listening" && question.audioUrl && (
                <div className="rounded bg-muted/50 p-3">
                  <p className="font-medium text-muted-foreground mb-2">Audio</p>
                  {playsUsed >= MAX_LISTENING_PLAYS ? (
                    <p className="text-sm text-muted-foreground">
                      Audio {MAX_LISTENING_PLAYS} marta eshitildi — tinglash limiti tugadi
                    </p>
                  ) : (
                    <>
                      <audio
                        key={question.id}
                        ref={listeningAudioRef}
                        src={fullAudioUrl(question.audioUrl)}
                        controls
                        controlsList="nodownload"
                        onEnded={() => {
                          const qId = question.id;
                          setListeningPlaysUsed((prev) => ({
                            ...prev,
                            [qId]: (prev[qId] ?? 0) + 1,
                          }));
                        }}
                      />
                      <p className="mt-2 text-xs text-muted-foreground">
                        {playsUsed === 0
                          ? `Audio jami ${MAX_LISTENING_PLAYS} marta eshitiladi`
                          : `Yana ${playsLeft} marta eshitishingiz mumkin`}
                      </p>
                    </>
                  )}
                </div>
              )}
              {question.transcript && (
                <div className="rounded bg-muted/50 p-3 text-sm" dir="rtl">
                  <p className="font-medium text-muted-foreground">Transkript</p>
                  <p className="whitespace-pre-wrap">{question.transcript}</p>
                </div>
              )}
              {question.passage && (
                <div className="rounded bg-muted/50 p-3 text-sm" dir="rtl">
                  <p className="font-medium text-muted-foreground">Matn</p>
                  <p className="whitespace-pre-wrap">{question.passage}</p>
                </div>
              )}
              <p className="text-foreground whitespace-pre-wrap" dir="auto">
                {question.questionText}
              </p>
              {isWriting && question.wordLimit && (
                <p className="text-sm text-muted-foreground">
                  So‘z limiti: {question.wordLimit}
                  {selected && (
                    <span className="ml-2">
                      (hozir: {(selected.trim() || "").split(/\s+/).filter(Boolean).length} so‘z)
                    </span>
                  )}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {isMcq &&
                (question.options ?? []).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    aria-pressed={selected === opt}
                    onClick={() => handleMcqSelect(question.id, opt)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left text-sm transition-colors",
                      selected === opt
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-muted/50"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              {(isWriting || isSpeaking) && (
                <div className="space-y-2">
                  {isSpeaking && (
                    <div className="flex flex-wrap items-center gap-2">
                      {speakingAudioUrl ? (
                        <>
                          <p className="text-sm text-muted-foreground">
                            Audio yuklandi. Xohlasangiz, quyida transkript yozishingiz mumkin.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              updateAnswerInCache(question.id, { audioUrl: null, answerText: "" });
                              toast.info("Avvalgi audio o‘chirildi — yangi javob yozib oling");
                            }}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Qayta yozib olish
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant={recordingState === "recording" ? "destructive" : "outline"}
                            size="sm"
                            onClick={recordingState === "recording" ? stopRecording : startRecording}
                            disabled={recordingState === "uploading"}
                          >
                            {recordingState === "uploading" ? <Loader2 className="h-4 w-4 animate-spin" /> : recordingState === "recording" ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                            {recordingState === "recording" ? " To‘xtatish" : recordingState === "uploading" ? " Yuklanmoqda…" : " Yozib olish"}
                          </Button>
                          <label className="cursor-pointer">
                            <span className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
                              <Upload className="h-4 w-4 mr-1" />
                              Fayl yuklash
                            </span>
                            <input
                              type="file"
                              accept="audio/*"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && question) {
                                  uploadSpeakingAudio(question.id, file).catch((err) => {
                                    toast.error(
                                      err instanceof Error
                                        ? err.message
                                        : "Audio yuklanmadi. Qayta urinib ko‘ring."
                                    );
                                  });
                                }
                                e.target.value = "";
                              }}
                            />
                          </label>
                        </>
                      )}
                    </div>
                  )}
                  <textarea
                    dir="rtl"
                    className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder={isWriting ? "Javobingizni yozing…" : "Ixtiyoriy: javob matnini yozing (audio yoki yozuv)"}
                    value={selected ?? ""}
                    onChange={(e) => handleTextChange(question.id, e.target.value)}
                  />
                  <p
                    className={cn(
                      "flex items-center gap-1 text-xs",
                      saveState === "error" ? "text-destructive" : "text-muted-foreground"
                    )}
                    aria-live="polite"
                  >
                    {saveState === "saving" && (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" /> Saqlanmoqda…
                      </>
                    )}
                    {saveState === "saved" && (
                      <>
                        <Check className="h-3 w-3" /> Saqlandi
                      </>
                    )}
                    {saveState === "error" && (
                      <>
                        <AlertTriangle className="h-3 w-3" /> Saqlanmadi — internetni tekshiring
                      </>
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mt-6 flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
          >
            Oldingi
          </Button>
          {currentIndex < questions.length - 1 ? (
            <Button onClick={() => setCurrentIndex((i) => i + 1)}>Keyingi</Button>
          ) : (
            <Button onClick={() => handleSubmit(false)} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Yakunlash
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
