import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/SiteHeader";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Mail, FileText, Video } from "lucide-react";
import { SEO } from "@/components/SEO";
import { StructuredData, buildBreadcrumbSchema } from "@/components/StructuredData";

export function YordamIndex() {
  const { i18n } = useTranslation();

  const links = [
    { to: "/yordam/boglanish", label: "Bog'lanish", icon: Mail },
    { to: "/yordam/qollanmalar", label: "Qo'llanmalar (pdf)", icon: FileText },
    { to: "/yordam/video", label: "Video qo'llanmalar", icon: Video },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <SEO
        title="Yordam markazi"
        description="AttanalPro platformasidan foydalanish bo'yicha yordam, qo'llanmalar, video darsliklar va bog'lanish ma'lumotlari."
        canonicalPath="/yordam"
        lang={i18n.language}
      />
      <StructuredData
        data={buildBreadcrumbSchema([
          { name: "Bosh sahifa", url: "https://attanalpro.uz/" },
          { name: "Yordam", url: "https://attanalpro.uz/yordam" },
        ])}
      />
      <SiteHeader lang={i18n.language} onLangChange={(code) => i18n.changeLanguage(code)} />
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Yordam</CardTitle>
            <CardDescription>Qo‘llanmalar va bog‘lanish</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-1">
            {links.map(({ to, label, icon: Icon }) => (
              <Button key={to} variant="outline" className="h-auto justify-start gap-3 py-4" asChild>
                <Link to={to}>
                  <Icon className="h-5 w-5 shrink-0" />
                  {label}
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
