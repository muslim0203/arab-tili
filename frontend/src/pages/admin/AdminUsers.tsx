import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/PageHeader";
import { api } from "@/lib/api";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

type UserRow = {
  id: string;
  email: string;
  fullName: string;
  subscriptionTier: string;
  subscriptionExpiresAt: string | null;
  isAdmin: boolean;
  lastLogin: string | null;
  createdAt: string;
  attemptsCount: number;
  paymentsCount: number;
};

type UsersResponse = {
  items: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function AdminUsers() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page],
    queryFn: () => api<UsersResponse>(`/admin/users?page=${page}&pageSize=20`),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <PageHeader title="Foydalanuvchilar" subtitle={"Jami: " + (data?.total ?? 0)} />
      <Card className="rounded-xl border-border shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ro‘yxat</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Ism</th>
                  <th className="text-left p-3 font-medium">Tarif</th>
                  <th className="text-left p-3 font-medium">Tugashi</th>
                  <th className="text-left p-3 font-medium">Admin</th>
                  <th className="text-left p-3 font-medium">Imtihonlar</th>
                  <th className="text-left p-3 font-medium">To‘lovlar</th>
                  <th className="text-left p-3 font-medium">Ro‘yxatdan</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">{u.fullName}</td>
                    <td className="p-3">{u.subscriptionTier}</td>
                    <td className="p-3">{u.subscriptionExpiresAt ? new Date(u.subscriptionExpiresAt).toLocaleDateString("uz-UZ") : "—"}</td>
                    <td className="p-3">{u.isAdmin ? "Ha" : "Yo‘q"}</td>
                    <td className="p-3">{u.attemptsCount}</td>
                    <td className="p-3">{u.paymentsCount}</td>
                    <td className="p-3 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString("uz-UZ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t">
              <p className="text-sm text-muted-foreground">
                Sahifa {data?.page ?? 1} / {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
