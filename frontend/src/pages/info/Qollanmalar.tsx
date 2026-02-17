import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/SiteHeader";
import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";

export function Qollanmalar() {
  const { i18n } = useTranslation();

  const manuals = [
    { title: "Foydalanuvchi qo‘llanmasi", description: "Tizimdan foydalanish bo‘yicha qisqacha ko‘rsatma", pdf: "#" },
    { title: "Imtihon qoidalari", description: "Mock imtihon topshirish va vaqt chegaralari", pdf: "#" },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader lang={i18n.language} onLangChange={(code) => i18n.changeLanguage(code)} />
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Qo‘llanmalar (PDF)</CardTitle>
            <CardDescription>Yuklab olish uchun qo‘llanmalar ro‘yxati</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {manuals.map((m) => (
              <a
                key={m.title}
                href={m.pdf}
                className="flex items-start gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <FileText className="h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">{m.title}</p>
                  <p className="text-sm text-muted-foreground">{m.description}</p>
                </div>
              </a>
            ))}
            <p className="text-sm text-muted-foreground pt-2">
              Haqiqiy PDF fayllarni keyinroq qo‘shishingiz mumkin. Hozircha placeholder.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
