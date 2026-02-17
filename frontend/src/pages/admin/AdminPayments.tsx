import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/PageHeader";
import { api } from "@/lib/api";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

type PaymentRow = {
  id: string;
  userId: string;
  userEmail: string;
  userFullName: string;
  amount: number;
  currency: string;
  status: string;
  planId: string | null;
  paymentProviderId: string | null;
  paidAt: string | null;
  createdAt: string;
};

type PaymentsResponse = {
  items: PaymentRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function AdminPayments() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-payments", page],
    queryFn: () => api<PaymentsResponse>(`/admin/payments?page=${page}&pageSize=20`),
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
      <PageHeader title="To'lovlar" subtitle={"Jami: " + (data?.total ?? 0)} />
      <Card className="rounded-xl border-border shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ro‘yxat</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium">Foydalanuvchi</th>
                  <th className="text-left p-3 font-medium">Summa</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Tarif</th>
                  <th className="text-left p-3 font-medium">To‘langan</th>
                  <th className="text-left p-3 font-medium">Yaratilgan</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <span className="font-medium">{p.userFullName}</span>
                      <br />
                      <span className="text-muted-foreground">{p.userEmail}</span>
                    </td>
                    <td className="p-3">
                      {p.amount.toLocaleString("uz-UZ")} {p.currency}
                    </td>
                    <td className="p-3">
                      <span className={p.status === "COMPLETED" ? "text-green-600" : p.status === "FAILED" ? "text-destructive" : "text-muted-foreground"}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3">{p.planId ?? "—"}</td>
                    <td className="p-3">{p.paidAt ? new Date(p.paidAt).toLocaleString("uz-UZ") : "—"}</td>
                    <td className="p-3 text-muted-foreground">{new Date(p.createdAt).toLocaleString("uz-UZ")}</td>
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
