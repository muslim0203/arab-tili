import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/SiteHeader";
import { useTranslation } from "react-i18next";
import { Mail, MessageCircle } from "lucide-react";
import { SEO } from "@/components/SEO";
import { StructuredData, buildBreadcrumbSchema } from "@/components/StructuredData";

export function Boglanish() {
  const { i18n } = useTranslation();

  return (
    <div className="min-h-screen bg-muted/30">
      <SEO
        title="Bog'lanish"
        description="AttanalPro bilan bog'lanish – savol, taklif va hamkorlik bo'yicha murojaat qiling. Email: support@attanalpro.uz"
        canonicalPath="/yordam/boglanish"
        lang={i18n.language}
      />
      <StructuredData
        data={buildBreadcrumbSchema([
          { name: "Bosh sahifa", url: "https://attanalpro.uz/" },
          { name: "Yordam", url: "https://attanalpro.uz/yordam" },
          { name: "Bog'lanish", url: "https://attanalpro.uz/yordam/boglanish" },
        ])}
      />
      <SiteHeader lang={i18n.language} onLangChange={(code) => i18n.changeLanguage(code)} />
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Bog‘lanish</CardTitle>
            <CardDescription>Savollar va takliflar uchun biz bilan bog‘laning</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-4 rounded-lg border p-4">
              <Mail className="h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-medium">Email</p>
                <p className="text-sm text-muted-foreground">
                  support@attanalpro.uz (namuna – o‘zingizning support emailingizni yozing)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-lg border p-4">
              <MessageCircle className="h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-medium">Qo‘llab-quvvatlash</p>
                <p className="text-sm text-muted-foreground">
                  Tizimdagi Yordam bo‘limi va FAQ orqali ham javob topishingiz mumkin.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
