import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/app/PageHeader";
import { StatsCard } from "@/components/app/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import {
  Loader2, Users, FileQuestion, CreditCard, TrendingUp,
  FileText, BookOpen, Headphones, PenTool, Mic,
} from "lucide-react";

type Stats = {
  usersCount: number;
  attemptsCount: number;
  completedAttempts: number;
  paymentsCompleted: number;
  totalRevenue: number;
  questionBank: {
    grammar: number;
    readingPassages: number;
    listeningStages: number;
    writingTasks: number;
    speakingTasks: number;
  };
};

const STAT_ITEMS = [
  { key: "usersCount", title: "Foydalanuvchilar", icon: Users },
  { key: "attemptsCount", title: "Barcha imtihonlar", icon: FileQuestion },
  { key: "completedAttempts", title: "Yakunlangan imtihonlar", icon: FileQuestion },
  { key: "paymentsCompleted", title: "To'lovlar (muvaffaqiyatli)", icon: CreditCard },
  { key: "totalRevenue", title: "Tushum (UZS)", icon: TrendingUp },
] as const;

const QB_ITEMS = [
  { key: "grammar" as const, title: "Grammatika", icon: FileText, to: "/admin/grammar", color: "text-blue-600 bg-blue-500/10" },
  { key: "readingPassages" as const, title: "Reading Passages", icon: BookOpen, to: "/admin/reading", color: "text-sky-600 bg-sky-500/10" },
  { key: "listeningStages" as const, title: "Listening Stages", icon: Headphones, to: "/admin/listening", color: "text-emerald-600 bg-emerald-500/10" },
  { key: "writingTasks" as const, title: "Writing Tasks", icon: PenTool, to: "/admin/writing", color: "text-amber-600 bg-amber-500/10" },
  { key: "speakingTasks" as const, title: "Speaking Tasks", icon: Mic, to: "/admin/speaking", color: "text-violet-600 bg-violet-500/10" },
];

export function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api<Stats>("/admin/stats"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <PageHeader title="Statistika" subtitle="Platforma bo'yicha asosiy ko'rsatkichlar" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STAT_ITEMS.map((item) => (
          <StatsCard
            key={item.key}
            label={item.title}
            value={
              item.key === "totalRevenue"
                ? (data?.totalRevenue ?? 0).toLocaleString("uz-UZ")
                : String(data?.[item.key] ?? 0)
            }
            icon={item.icon}
          />
        ))}
      </div>

      {/* Question Bank overview */}
      <Card className="rounded-xl border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">📚 Savol banki</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {QB_ITEMS.map((item) => {
              const Icon = item.icon;
              const count = data?.questionBank?.[item.key] ?? 0;
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors group"
                >
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${item.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{item.title}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
