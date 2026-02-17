import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/SiteHeader";
import { useTranslation } from "react-i18next";
import { SEO } from "@/components/SEO";
import { StructuredData, buildBreadcrumbSchema } from "@/components/StructuredData";

export function TizimHaqida() {
  const { i18n } = useTranslation();

  return (
    <div className="min-h-screen bg-muted/30">
      <SEO
        title="Tizim haqida"
        description="AttanalPro platformasi haqida: CEFR asosida arab tili baholash, 5 bo'lim (listening, reading, language use, writing, speaking), AI tutor."
        canonicalPath="/tizim-haqida"
        lang={i18n.language}
      />
      <StructuredData
        data={buildBreadcrumbSchema([
          { name: "Bosh sahifa", url: "https://attanalpro.uz/" },
          { name: "Tizim haqida", url: "https://attanalpro.uz/tizim-haqida" },
        ])}
      />
      <SiteHeader lang={i18n.language} onLangChange={(code) => i18n.changeLanguage(code)} />
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Tizim haqida</CardTitle>
            <CardDescription>AttanalPro – Arab tili imtihoniga tayyorgarlik platformasi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              AttanalPro – bu CEFR (Common European Framework of Reference) asosida arab tili bilimlarini
              baholash va mock imtihonlar orqali tayyorgarlik ko‘rish uchun yaratilgan platforma.
            </p>
            <p>
              Tizimda listening, reading, language use, writing va speaking bo‘limlari mavjud. AI tutor
              yordamida savollaringizga javob olishingiz va natijalaringiz bo‘yicha tahlil olishingiz mumkin.
            </p>
            <p>
              Mock imtihonlar va CEFR darajangizni aniqlash uchun ro‘yxatdan o‘ting yoki tizimga kiring.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
