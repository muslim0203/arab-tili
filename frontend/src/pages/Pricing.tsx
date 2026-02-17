import { useState } from "react";

import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/app/AppLayout";
import { PageHeader } from "@/components/app/PageHeader";
import { Badge } from "@/components/app/Badge";
import { api } from "@/lib/api";
import { Loader2, Check } from "lucide-react";

type Plan = {
  id: string;
  tier: string;
  name: string;
  nameUz: string;
  durationMonths: number;
  amount: number;
  currency: string;
  description: string;
};

export function Pricing() {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => api<{ plans: Plan[] }>("/subscriptions/plans"),
  });

  const createPayment = useMutation({
    mutationFn: (planId: string) =>
      api<{ paymentId: string; redirectUrl: string; amount: number; currency: string }>(
        "/subscriptions/create-payment",
        { method: "POST", body: { planId } }
      ),
    onSuccess: (data) => {
      window.location.href = data.redirectUrl;
    },
    onError: (e) => {
      alert(e instanceof Error ? e.message : "To'lov yaratilmadi");
      setSelectedPlanId(null);
    },
  });

  const plans = data?.plans ?? [];

  return (
    <AppLayout>
      <motion.div
        className="space-y-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <PageHeader
          title="Tariflar"
          subtitle="AI Tutor va barcha imtihonlar uchun obuna tanlang."
        />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Card
                  className={`flex flex-col rounded-xl border-border shadow-sm transition-shadow hover:shadow-md ${plan.tier === "INTENSIVE" ? "ring-2 ring-primary/20" : ""
                    }`}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {plan.nameUz}
                      {plan.tier === "INTENSIVE" && (
                        <Badge variant="primary">Tavsiya</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                      {plan.amount.toLocaleString("uz-UZ")} {plan.currency}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{plan.durationMonths} oy
                      </span>
                    </p>
                  </CardHeader>
                  <CardContent className="mt-auto space-y-4 pt-4">
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                        CEFR mock imtihonlar
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                        {plan.description}
                      </li>
                    </ul>
                    <Button
                      className="w-full rounded-xl"
                      onClick={() => {
                        setSelectedPlanId(plan.id);
                        createPayment.mutate(plan.id);
                      }}
                      disabled={createPayment.isPending && selectedPlanId === plan.id}
                      aria-busy={createPayment.isPending && selectedPlanId === plan.id}
                    >
                      {createPayment.isPending && selectedPlanId === plan.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Click orqali to'lash"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground">
          To'lov Click orqali xavfsiz amalga oshiriladi. Obuna muddati tugagach,
          tarif FREE ga o'tadi.
        </p>
      </motion.div>
    </AppLayout>
  );
}
