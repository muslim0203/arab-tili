import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/app/AppLayout";
import { PageHeader } from "@/components/app/PageHeader";
import { Badge } from "@/components/app/Badge";
import { api } from "@/lib/api";
import { Loader2, Check, CreditCard, Wallet, Shield } from "lucide-react";

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

type PaymentProvider = "click" | "payme";

export function Pricing() {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [provider, setProvider] = useState<PaymentProvider>("click");

  const { data, isLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => api<{ plans: Plan[] }>("/subscriptions/plans"),
  });

  const createPayment = useMutation({
    mutationFn: ({ planId, provider }: { planId: string; provider: PaymentProvider }) =>
      api<{ paymentId: string; redirectUrl: string; amount: number; currency: string; provider: string }>(
        "/subscriptions/create-payment",
        { method: "POST", body: { planId, provider } }
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

  const handleBuy = (planId: string) => {
    setSelectedPlanId(planId);
    createPayment.mutate({ planId, provider });
  };

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

        {/* ── To'lov tizimi tanlash ── */}
        <div className="flex items-center justify-center gap-3">
          <span className="text-sm text-muted-foreground font-medium">To'lov usuli:</span>
          <div className="flex bg-muted/50 rounded-xl p-1 gap-1">
            <button
              onClick={() => setProvider("click")}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
                ${provider === "click"
                  ? "bg-[#00B4E6] text-white shadow-md shadow-[#00B4E6]/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                }
              `}
            >
              <CreditCard className="h-4 w-4" />
              Click
            </button>
            <button
              onClick={() => setProvider("payme")}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
                ${provider === "payme"
                  ? "bg-[#00CCCC] text-white shadow-md shadow-[#00CCCC]/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                }
              `}
            >
              <Wallet className="h-4 w-4" />
              Payme
            </button>
          </div>
        </div>

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
                  className={`flex flex-col rounded-2xl border-border shadow-sm transition-all duration-200 hover:shadow-lg ${plan.tier === "INTENSIVE"
                    ? "ring-2 ring-primary/20 relative overflow-hidden"
                    : ""
                    }`}
                >
                  {plan.tier === "INTENSIVE" && (
                    <div className="absolute top-0 right-0">
                      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs font-bold px-4 py-1 rounded-bl-xl">
                        ⭐ TAVSIYA
                      </div>
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {plan.nameUz}
                      {plan.tier === "INTENSIVE" && (
                        <Badge variant="primary">Eng foydali</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-3">
                      <p className="text-3xl font-bold tracking-tight text-foreground">
                        {plan.amount.toLocaleString("uz-UZ")}
                        <span className="text-base font-normal text-muted-foreground ml-1">
                          so'm
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {plan.durationMonths} oy uchun
                        {plan.durationMonths > 1 && (
                          <span className="ml-1.5 text-primary font-medium">
                            ({Math.round(plan.amount / plan.durationMonths).toLocaleString("uz-UZ")} so'm/oy)
                          </span>
                        )}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="mt-auto space-y-4 pt-4">
                    <ul className="space-y-2.5 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2.5">
                        <div className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-emerald-600" />
                        </div>
                        CEFR mock imtihonlar
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-emerald-600" />
                        </div>
                        {plan.description}
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-emerald-600" />
                        </div>
                        Batafsil natijalar va tahlil
                      </li>
                      {plan.tier === "INTENSIVE" && (
                        <li className="flex items-center gap-2.5 text-primary font-medium">
                          <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3 text-primary" />
                          </div>
                          Shaxsiy o'quv rejasi
                        </li>
                      )}
                    </ul>

                    <Button
                      className={`w-full rounded-xl h-12 text-base font-semibold transition-all duration-200 ${provider === "click"
                          ? "bg-[#00B4E6] hover:bg-[#009DD0] text-white"
                          : "bg-[#00CCCC] hover:bg-[#00B8B8] text-white"
                        }`}
                      onClick={() => handleBuy(plan.id)}
                      disabled={createPayment.isPending && selectedPlanId === plan.id}
                      aria-busy={createPayment.isPending && selectedPlanId === plan.id}
                    >
                      {createPayment.isPending && selectedPlanId === plan.id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          {provider === "click" ? (
                            <CreditCard className="h-5 w-5 mr-2" />
                          ) : (
                            <Wallet className="h-5 w-5 mr-2" />
                          )}
                          {provider === "click" ? "Click" : "Payme"} orqali to'lash
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Ishonch kafolati ── */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-medium">Xavfsiz to'lov</span>
          </div>
          <p className="text-center text-sm text-muted-foreground max-w-md">
            To'lov {provider === "click" ? "Click" : "Payme"} orqali xavfsiz amalga oshiriladi.
            Obuna muddati tugagach, tarif FREE ga o'tadi.
          </p>
          <div className="flex items-center gap-4 mt-1">
            <div className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${provider === "click" ? "bg-[#00B4E6]/10 text-[#00B4E6]" : "bg-muted text-muted-foreground"}`}>
              CLICK
            </div>
            <div className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${provider === "payme" ? "bg-[#00CCCC]/10 text-[#00CCCC]" : "bg-muted text-muted-foreground"}`}>
              PAYME
            </div>
          </div>
        </div>
      </motion.div>
    </AppLayout>
  );
}
