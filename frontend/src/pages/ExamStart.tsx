import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function ExamStart() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const isCefrFull = examId === "cefr-full";

  const start = async () => {
    if (!examId) return;
    if (isCefrFull && !selectedLevel) {
      setError("Darajani tanlang");
      return;
    }
    setError("");
    setLoading(true);
    try {
      if (isCefrFull) {
        const res = await api<{ attemptId: string }>("/exams/cefr/start", {
          method: "POST",
          body: { level: selectedLevel },
        });
        navigate(`/exam/${res.attemptId}`, { replace: true });
      } else {
        const res = await api<{ attemptId: string }>(`/exams/${examId}/start`, { method: "POST" });
        navigate(`/exam/${res.attemptId}`, { replace: true });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Imtihon boshlanmadi");
    } finally {
      setLoading(false);
    }
  };

  if (isCefrFull) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>CEFR to‘liq imtihon</CardTitle>
            <CardDescription>
              Darajani tanlang. Imtihon 5 bo‘limdan iborat: Listening, Reading, Language Use, Writing, Speaking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-medium">Daraja</p>
            <div className="grid grid-cols-3 gap-2">
              {CEFR_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSelectedLevel(level)}
                  className={cn(
                    "rounded-lg border py-2 text-sm font-medium transition-colors",
                    selectedLevel === level ? "border-primary bg-primary/10 text-primary" : "border-input hover:bg-muted/50"
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={start} disabled={loading || !selectedLevel} className="w-full">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generatsiya qilinmoqda…</> : "Imtihonni boshlash"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Listening, Reading, Language Use – savollar omboridan; Writing va Speaking – AI orqali. Tez boshlanadi.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 p-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={start} disabled={loading}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Yuklanmoqda…</> : "Imtihonni boshlash"}
      </Button>
      <p className="text-sm text-muted-foreground">
        AI imtihon bo‘lsa, savollar generatsiya qilinadi (bir necha soniya vaqt olishi mumkin).
      </p>
    </div>
  );
}
