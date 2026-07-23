import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { AccessStatus } from "@/pages/PricingPage";
import { CheckCircle, Loader2, Clock, AlertCircle } from "lucide-react";

// Backend'da payment_id bo'yicha to'lov statusini qaytaradigan ochiq endpoint YO'Q
// (faqat admin-only /admin/payments mavjud). Shu sababli to'lovni bevosita
// tekshira olmaymiz — obuna faollashguncha /access/status ni bir necha marta
// so'rab (polling), natijani halol ko'rsatamiz.
const MAX_POLLS = 6; // ~6 × 2.5s ≈ 15s timeout

function isActivated(s?: AccessStatus): boolean {
  return (
    !!s &&
    (s.subscription.active || s.planType !== "free" || s.purchases.mockExam.available > 0)
  );
}

export function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get("payment_id");
  const setAuth = useAuthStore((s) => s.setAuth);

  // /access/status necha marta yangilandi — timeout aniqlash uchun.
  const [checks, setChecks] = useState(0);

  const { data: status, error, refetch, isFetching, dataUpdatedAt } = useQuery<AccessStatus>({
    queryKey: ["access-status"],
    queryFn: () => api<AccessStatus>("/access/status"),
    enabled: !!paymentId,
    // Obuna faollashguncha yoki timeout'gacha polling.
    refetchInterval: (query) => {
      if (isActivated(query.state.data)) return false;
      if (query.state.dataUpdateCount >= MAX_POLLS) return false;
      return 2500;
    },
  });

  useEffect(() => {
    if (dataUpdatedAt) setChecks((c) => c + 1);
  }, [dataUpdatedAt]);

  const activated = isActivated(status);

  // Obuna faollashsa — profildagi tier ham yangilansin.
  useEffect(() => {
    if (!activated) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await api<{ user: NonNullable<ReturnType<typeof useAuthStore.getState>["user"]> }>(
          "/auth/me"
        );
        if (cancelled || !me?.user) return;
        const { accessToken, refreshToken } = useAuthStore.getState();
        if (accessToken && refreshToken) setAuth(me.user, accessToken, refreshToken);
      } catch {
        /* profilni yangilay olmadik — kritik emas */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activated, setAuth]);

  const timedOut = !activated && checks >= MAX_POLLS && !isFetching;

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">{renderBody()}</Card>
    </div>
  );

  function renderBody() {
    // 1) payment_id umuman kelmadi.
    if (!paymentId) {
      return (
        <>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-amber-500" />
              To'lov ma'lumoti topilmadi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To'lov identifikatori topilmadi. Agar to'lovni amalga oshirgan bo'lsangiz,
              obuna holatingizni tariflar sahifasidan tekshiring.
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link to="/pricing">Tariflarga o'tish</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/dashboard">Dashboardga o'tish</Link>
              </Button>
            </div>
          </CardContent>
        </>
      );
    }

    // 2) So'rov xato bo'ldi.
    if (error && !status) {
      return (
        <>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
              Holatni tekshirib bo'lmadi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Obuna holatini yuklab bo'lmadi."}
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => refetch()} disabled={isFetching} className="w-full">
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Qayta urinish"}
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/dashboard">Dashboardga o'tish</Link>
              </Button>
            </div>
          </CardContent>
        </>
      );
    }

    // 3) Obuna faollashdi — haqiqiy muvaffaqiyat.
    if (activated) {
      return (
        <>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              To'lov muvaffaqiyatli
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Obunangiz faollashtirildi. Endi AI Tutor va barcha imtihonlardan to'liq
              foydalanishingiz mumkin.
            </p>
            <Button asChild className="w-full">
              <Link to="/dashboard">Dashboardga o'tish</Link>
            </Button>
          </CardContent>
        </>
      );
    }

    // 4) Timeout — hali faollashmadi. Yolg'on "muvaffaqiyat" emas, kutish holati.
    if (timedOut) {
      return (
        <>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-6 w-6 text-amber-500" />
              To'lov qabul qilindi, tekshirilmoqda
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To'lovingiz qabul qilindi. Obunani faollashtirish bir necha daqiqa vaqt olishi
              mumkin. Joriy holat:{" "}
              <span className="font-medium text-foreground">
                {status ? planLabel(status.planType) : "—"}
              </span>
              .
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => refetch()} disabled={isFetching} className="w-full">
                {isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Holatni yangilash"
                )}
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/dashboard">Dashboardga o'tish</Link>
              </Button>
            </div>
          </CardContent>
        </>
      );
    }

    // 5) Hali tekshirilmoqda (polling).
    return (
      <>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            To'lov tekshirilmoqda…
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            To'lovingiz tasdiqlanishi kutilmoqda. Iltimos, bu sahifani yopmang.
          </p>
        </CardContent>
      </>
    );
  }
}

function planLabel(plan: AccessStatus["planType"]): string {
  if (plan === "pro") return "Pro";
  if (plan === "standard") return "Standard";
  return "Bepul";
}
