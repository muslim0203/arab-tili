import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { SEO } from "@/components/SEO";

const schema = z.object({
  fullName: z.string().min(1, "Ism kiritilishi shart"),
  email: z.string().email("To‘g‘ri email kiriting"),
  password: z.string().min(6, "Parol kamida 6 belgi"),
  languagePreference: z.enum(["uz", "ru", "ar"]).optional().default("uz"),
});

type FormData = z.infer<typeof schema>;

export function Register() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState("");

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

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-muted/30 p-4">
      <SEO title="Ro'yxatdan o'tish" description="Bepul ro'yxatdan o'ting va arab tili CEFR mock imtihoniga tayyorlaning. AttanalPro platformasi." canonicalPath="/register" />
      <Card className="w-full max-w-md rounded-xl border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Hisob yaratish</CardTitle>
          <CardDescription>AttanalPro – Arab tili imtihoniga tayyorgarlik</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl" role="alert">{error}</p>
          )}
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
            <Button type="submit" className="w-full">Ro‘yxatdan o‘tish</Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Hisobingiz bormi?{" "}
            <Link to="/login" className="text-primary hover:underline">Kirish</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
