import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/SiteHeader";
import { useTranslation } from "react-i18next";
import { Video } from "lucide-react";

export function VideoQollanmalar() {
  const { i18n } = useTranslation();

  const videos = [
    { title: "Tizimga kirish va ro‘yxatdan o‘tish", description: "Hisob yaratish va login" },
    { title: "Mock imtihonni boshlash", description: "Imtihon tanlash va javob berish" },
    { title: "AI Tutor bilan ishlash", description: "Savol berish va javob olish" },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader lang={i18n.language} onLangChange={(code) => i18n.changeLanguage(code)} />
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Video qo‘llanmalar</CardTitle>
            <CardDescription>Qisqa video ko‘rsatmalar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {videos.map((m) => (
              <div
                key={m.title}
                className="flex items-start gap-4 rounded-lg border p-4"
              >
                <Video className="h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">{m.title}</p>
                  <p className="text-sm text-muted-foreground">{m.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">Video linki keyinroq qo‘shiladi.</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
