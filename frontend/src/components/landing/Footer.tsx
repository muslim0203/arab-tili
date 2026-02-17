import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail, Github, Twitter, Linkedin } from "lucide-react";

const FOOTER_LINKS_PRODUCT = [
  { labelKey: "nav.pricing" as const, href: "/#pricing" },
  { labelKey: "nav.login" as const, href: "/login" },
  { labelKey: "footer.register" as const, href: "/register" },
  { labelKey: "footer.contactLink" as const, href: "/yordam/boglanish" },
];

const FOOTER_LINKS_INFO = [
  { labelKey: "footer.about" as const, href: "/tizim-haqida" },
  { labelKey: "footer.helpLink" as const, href: "/yordam" },
];

const SOCIALS = [
  { label: "Twitter", href: "#", icon: Twitter },
  { label: "LinkedIn", href: "#", icon: Linkedin },
  { label: "GitHub", href: "#", icon: Github },
];

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border bg-muted/30" role="contentinfo">
      <div className="container mx-auto px-4 py-12 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/" className="text-lg font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded">
              AttanalPro
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              {t("footer.tagline")}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">{t("footer.product")}</h3>
            <ul className="mt-4 space-y-2" role="list">
              {FOOTER_LINKS_PRODUCT.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">{t("footer.info")}</h3>
            <ul className="mt-4 space-y-2" role="list">
              {FOOTER_LINKS_INFO.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">{t("footer.contact")}</h3>
            <a
              href="mailto:support@attanalpro.uz"
              className="mt-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
            >
              <Mail className="h-4 w-4" aria-hidden />
              support@attanalpro.uz
            </a>
            <div className="mt-4 flex gap-4">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                  aria-label={s.label}
                >
                  <s.icon className="h-5 w-5" aria-hidden />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} AttanalPro. {t("footer.rights")}
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/yordam" className="hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded">
              {t("footer.helpLink")}
            </Link>
            <Link to="/yordam/boglanish" className="hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded">
              {t("footer.contactLink")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
