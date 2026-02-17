import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { CheckCircle, Loader2 } from "lucide-react";

export function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get("payment_id");
  const setAuth = useAuthStore((s) => s.setAuth);
  const user = useAuthStore((s) => s.user);

  const { data: me, isSuccess } = useQuery({
    queryKey: ["auth-me"],
    queryFn: () => api<{ user: NonNullable<typeof user> }>("/auth/me"),
    enabled: !!paymentId,
  });

  useEffect(() => {
    if (isSuccess && me?.user) {
      const { accessToken, refreshToken } = useAuthStore.getState();
      if (accessToken && refreshToken) setAuth(me.user, accessToken, refreshToken);
    }
  }, [isSuccess, me?.user, setAuth]);

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isSuccess ? <CheckCircle className="h-6 w-6 text-green-600" /> : <Loader2 className="h-6 w-6 animate-spin" />}
            {isSuccess ? "To‘lov muvaffaqiyatli" : "Yuklanmoqda…"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSuccess ? (
            <>
              <p className="text-sm text-muted-foreground">
                Obunangiz faollashtirildi. Endi AI Tutor va barcha imtihonlardan to‘liq foydalanishingiz mumkin.
              </p>
              <Button asChild className="w-full">
                <Link to="/dashboard">Dashboardga o‘tish</Link>
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Profil yangilanmoqda…</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
