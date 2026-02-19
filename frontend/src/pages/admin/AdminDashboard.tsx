import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Users, CreditCard, FileText, BookOpen, Headphones, PenTool, Mic,
  BarChart3, CheckCircle, TrendingUp,
} from "lucide-react";

interface Stats {
  usersCount: number;
  attemptsCount: number;
  completedAttempts: number;
  paymentsCompleted: number;
  totalRevenue: number;
  questionBank: {
    grammar: number;
    readingPassages: number;
    listeningQuestions: number;
    writingTasks: number;
    speakingTasks: number;
  };
  byDifficulty: {
    grammar: Record<string, number>;
    reading: Record<string, number>;
    listening: Record<string, number>;
  };
}

const diffColors: Record<string, string> = {
  easy: "bg-emerald-500",
  medium: "bg-amber-500",
  hard: "bg-red-500",
};

function DifficultyBar({ data }: { data: Record<string, number> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return <p className="text-xs text-muted-foreground">Hali savollar yo'q</p>;
  return (
    <div className="flex gap-1 mt-2">
      {["easy", "medium", "hard"].map((d) => {
        const count = data[d] || 0;
        const pct = Math.round((count / total) * 100);
        if (pct === 0) return null;
        return (
          <div key={d} className="flex flex-col items-center" style={{ flex: pct }}>
            <div className={`h-2 w-full rounded-full ${diffColors[d]}`} />
            <span className="text-[10px] text-muted-foreground mt-1">{d} ({count})</span>
          </div>
        );
      })}
    </div>
  );
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Stats>("/admin/stats").then((d) => { setStats(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!stats) return <p className="text-destructive p-4">Statistikani yuklashda xatolik</p>;

  const mainCards = [
    { label: "Foydalanuvchilar", value: stats.usersCount, icon: Users, color: "text-blue-500" },
    { label: "Imtihonlar", value: stats.attemptsCount, icon: BarChart3, color: "text-purple-500" },
    { label: "Yakunlangan", value: stats.completedAttempts, icon: CheckCircle, color: "text-emerald-500" },
    { label: "To'lovlar", value: stats.paymentsCompleted, icon: CreditCard, color: "text-amber-500" },
    { label: "Daromad (UZS)", value: stats.totalRevenue.toLocaleString(), icon: TrendingUp, color: "text-rose-500" },
  ];

  const qbCards = [
    { label: "Grammatika", value: stats.questionBank.grammar, icon: FileText, color: "text-sky-500", diff: stats.byDifficulty.grammar },
    { label: "O'qish (Passage)", value: stats.questionBank.readingPassages, icon: BookOpen, color: "text-teal-500", diff: stats.byDifficulty.reading },
    { label: "Tinglash (Savol)", value: stats.questionBank.listeningQuestions, icon: Headphones, color: "text-violet-500", diff: stats.byDifficulty.listening },
    { label: "Yozish", value: stats.questionBank.writingTasks, icon: PenTool, color: "text-orange-500" },
    { label: "Gapirish", value: stats.questionBank.speakingTasks, icon: Mic, color: "text-pink-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">📊 Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">At-Ta'anul Platform – Umumiy statistika</p>
      </div>

      {/* Main stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {mainCards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <c.icon className={`h-5 w-5 ${c.color}`} />
              <span className="text-sm text-muted-foreground">{c.label}</span>
            </div>
            <p className="text-2xl font-bold mt-2">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Question bank stats */}
      <div>
        <h2 className="text-lg font-semibold mb-3">📚 Savol Banki</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {qbCards.map((c) => (
            <div key={c.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <c.icon className={`h-5 w-5 ${c.color}`} />
                  <span className="text-sm font-medium">{c.label}</span>
                </div>
                <span className="text-xl font-bold">{c.value}</span>
              </div>
              {"diff" in c && c.diff && <DifficultyBar data={c.diff} />}
            </div>
          ))}
        </div>
      </div>

      {/* Difficulty legend */}
      <div className="flex gap-6 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Oson (Easy)</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> O'rta (Medium)</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Qiyin (Hard)</span>
      </div>
    </div>
  );
}
