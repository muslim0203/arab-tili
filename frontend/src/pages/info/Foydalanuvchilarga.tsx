import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/SiteHeader";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { StructuredData, buildBreadcrumbSchema } from "@/components/StructuredData";

export function Foydalanuvchilarga() {
  const { i18n } = useTranslation();

  return (
    <div className="min-h-screen bg-muted/30">
      <SEO
        title="Foydalanuvchilarga"
        description="Talabalar va o'quvchilar uchun arab tili CEFR mock imtihoniga tayyorgarlik: listening, reading, writing, speaking bo'limlari, AI tutor va batafsil natijalar."
        canonicalPath="/foydalanuvchilarga"
        lang={i18n.language}
      />
      <StructuredData
        data={buildBreadcrumbSchema([
          { name: "Bosh sahifa", url: "https://Arab Exam.uz/" },
          { name: "Foydalanuvchilarga", url: "https://Arab Exam.uz/foydalanuvchilarga" },
        ])}
      />
      <SiteHeader lang={i18n.language} onLangChange={(code) => i18n.changeLanguage(code)} />
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Foydalanuvchilarga</CardTitle>
            <CardDescription>Shaxsiy foydalanuvchilar uchun qo‘llanma va imkoniyatlar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              Shaxsiy hisob oching, mock imtihonlarni topshiring va CEFR darajangizni bilib oling.
              AI tutor orqali savollaringizga javob oling va progress sahifasida natijalaringizni kuzating.
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Mock imtihonlar – listening, reading, writing, speaking</li>
              <li>CEFR darajasi va feedback</li>
              <li>AI Tutor – savol-javob</li>
              <li>Imtihonlar tarixi va statistika</li>
            </ul>
            <Button asChild className="mt-4">
              <Link to="/register">Ro‘yxatdan o‘tish</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
