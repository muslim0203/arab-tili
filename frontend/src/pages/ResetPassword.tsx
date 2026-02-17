import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

const schema = z.object({
  token: z.string().min(1, "Token kerak"),
  newPassword: z.string().min(6, "Parol kamida 6 belgi"),
});
type FormData = z.infer<typeof schema>;

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token") ?? "";
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { token: tokenFromUrl },
  });

  const onSubmit = async (data: FormData) => {
    setError("");
    try {
      await api("/auth/reset-password", {
        method: "POST",
        body: data,
        skipAuth: true,
      });
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Yangi parol</CardTitle>
          <CardDescription>Yangi parolni kiriting (kamida 6 belgi).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {success ? (
            <p className="text-sm text-muted-foreground">Parol yangilandi. Endi yangi parol bilan kiring.</p>
          ) : (
            <>
              {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {tokenFromUrl ? <input type="hidden" {...register("token")} /> : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Token</label>
                    <Input placeholder="Parol tiklash tokeni" {...register("token")} />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Yangi parol</label>
                  <Input type="password" placeholder="Kamida 6 belgi" {...register("newPassword")} />
                </div>
                <Button type="submit" className="w-full">Saqlash</Button>
              </form>
            </>
          )}
          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">Kirish</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
