import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

const schema = z.object({ email: z.string().email("To‘g‘ri email kiriting") });
type FormData = z.infer<typeof schema>;

export function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError("");
    try {
      await api<{ message?: string; token?: string }>("/auth/forgot-password", {
        method: "POST",
        body: data,
        skipAuth: true,
      });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Parolni unutdingizmi?</CardTitle>
          <CardDescription>Email manzilingizni kiriting, parolni tiklash bo‘yicha ko‘rsatma yuboramiz.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sent ? (
            <p className="text-sm text-muted-foreground">
              Agar bunday email ro‘yxatdan o‘tgan bo‘lsa, xabar yuborildi. Emailingizni tekshiring.
            </p>
          ) : (
            <>
              {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" placeholder="you@example.com" {...register("email")} />
                </div>
                <Button type="submit" className="w-full">Yuborish</Button>
              </form>
            </>
          )}
          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">Kirish sahifasiga qaytish</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
