import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/SiteHeader";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { StructuredData, buildBreadcrumbSchema } from "@/components/StructuredData";

export function Tashkilotlarga() {
  const { i18n } = useTranslation();

  return (
    <div className="min-h-screen bg-muted/30">
      <SEO
        title="Tashkilotlarga"
        description="Maktab, universitet va test markazlari uchun arab tili CEFR imtihon platformasi. Guruh obunalari, o'qituvchi paneli va natijalar monitoring."
        canonicalPath="/tashkilotlarga"
        lang={i18n.language}
      />
      <StructuredData
        data={buildBreadcrumbSchema([
          { name: "Bosh sahifa", url: "https://Arab Exam.uz/" },
          { name: "Tashkilotlarga", url: "https://Arab Exam.uz/tashkilotlarga" },
        ])}
      />
      <SiteHeader lang={i18n.language} onLangChange={(code) => i18n.changeLanguage(code)} />
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Tashkilotlarga</CardTitle>
            <CardDescription>Maktablar, universitetlar va tashkilotlar uchun</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              Arab Exam tashkilotlar uchun guruh obunalari va boshqaruv imkoniyatlarini taqdim etadi.
              O‘quvchilar yoki xodimlar uchun hisoblar yaratishingiz va natijalarni kuzatishingiz mumkin.
            </p>
            <p>
              Hamkorlik va narxlar bo‘yicha biz bilan bog‘laning – Yordam → Bog‘lanish orqali.
            </p>
            <Button variant="outline" asChild className="mt-4">
              <Link to="/yordam/boglanish">Bog‘lanish</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
