import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { SEO } from "@/components/SEO";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

const schema = z.object({
  fullName: z.string().min(1, "Ism kiritilishi shart"),
  email: z.string().email("To'g'ri email kiriting"),
  password: z.string().min(6, "Parol kamida 6 belgi"),
  languagePreference: z.enum(["uz", "ru", "ar"]).optional().default("uz"),
});

type FormData = z.infer<typeof schema>;

export function Register() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { languagePreference: "uz" },
  });

  const onSubmit = async (data: FormData) => {
    setError("");
    try {
      const res = await api<{ user: unknown; accessToken: string; refreshToken: string }>("/auth/register", {
        method: "POST",
        body: data,
        skipAuth: true,
      });
      setAuth(res.user as Parameters<typeof setAuth>[0], res.accessToken, res.refreshToken);
      toast.success("Hisob muvaffaqiyatli yaratildi!");
      navigate("/dashboard", { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ro'yxatdan o'tish amalga oshmadi";
      setError(msg);
      toast.error(msg);
    }
  };

  const googleLogin = useGoogleLogin({
    flow: "implicit",
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setError("");
      try {
        const res = await api<{ user: unknown; accessToken: string; refreshToken: string }>("/auth/google", {
          method: "POST",
          body: { idToken: tokenResponse.access_token },
          skipAuth: true,
        });
        setAuth(res.user as Parameters<typeof setAuth>[0], res.accessToken, res.refreshToken);
        toast.success("Google bilan muvaffaqiyatli ro'yxatdan o'tdingiz!");
        navigate("/dashboard", { replace: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Google bilan ro'yxatdan o'tish amalga oshmadi";
        setError(msg);
        toast.error(msg);
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: (error) => {
      console.error("Google register error:", error);
      setError("Google bilan ro'yxatdan o'tish bekor qilindi");
      toast.error("Google bilan ro'yxatdan o'tish bekor qilindi");
    },
  });

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-muted/30 p-4">
      <SEO title="Ro'yxatdan o'tish" description="Bepul ro'yxatdan o'ting va arab tili CEFR mock imtihoniga tayyorlaning. Arab Exam platformasi." canonicalPath="/register" />
      <Card className="w-full max-w-md rounded-xl border-border shadow-lg">
        <CardHeader>
          <div className="mb-2">
            <img src="/logo.png" alt="Arab Exam" className="h-12 w-auto object-contain" />
          </div>
          <CardTitle className="text-xl">Hisob yaratish</CardTitle>
          <CardDescription>Arab Exam – Arab tili imtihoniga tayyorgarlik</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl" role="alert">{error}</p>
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full min-h-11 rounded-xl touch-manipulation flex items-center justify-center gap-2 border border-input hover:bg-muted/50"
            onClick={() => googleLogin()}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            <span>{googleLoading ? "Kutilmoqda..." : "Google bilan ro'yxatdan o'tish"}</span>
          </Button>
          <div className="relative flex items-center py-2">
            <div className="flex-1 border-t border-border" />
            <span className="px-3 text-xs text-muted-foreground">yoki</span>
            <div className="flex-1 border-t border-border" />
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ism</label>
              <Input placeholder="Ismingiz" {...register("fullName")} />
              {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" placeholder="you@example.com" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Parol</label>
              <Input type="password" placeholder="Kamida 6 belgi" {...register("password")} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full min-h-11 rounded-xl touch-manipulation">Ro'yxatdan o'tish</Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Hisobingiz bormi?{" "}
            <Link to="/login" className="text-primary hover:underline touch-manipulation">Kirish</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
