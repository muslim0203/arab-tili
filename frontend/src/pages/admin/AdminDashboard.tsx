import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app/PageHeader";
import { StatsCard } from "@/components/app/StatsCard";
import { api } from "@/lib/api";
import { Loader2, Users, FileQuestion, CreditCard, TrendingUp } from "lucide-react";

type Stats = {
  usersCount: number;
  attemptsCount: number;
  completedAttempts: number;
  paymentsCompleted: number;
  totalRevenue: number;
};

const STAT_ITEMS = [
  { key: "usersCount", title: "Foydalanuvchilar", icon: Users },
  { key: "attemptsCount", title: "Barcha imtihonlar", icon: FileQuestion },
  { key: "completedAttempts", title: "Yakunlangan imtihonlar", icon: FileQuestion },
  { key: "paymentsCompleted", title: "To'lovlar (muvaffaqiyatli)", icon: CreditCard },
  { key: "totalRevenue", title: "Tushum (UZS)", icon: TrendingUp },
] as const;

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
        {STAT_ITEMS.map((item, i) => (
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
    </motion.div>
  );
}
