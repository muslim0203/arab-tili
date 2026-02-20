import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const LANGUAGES = [
  { code: "uz", label: "Oʻzbekcha" },
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
] as const;

// Nav menyusi
const NAV_ITEMS = [
  {
    label: "Tizim haqida",
    children: [
      { label: "Biz haqimizda", href: "/tizim-haqida" },
      { label: "Qaror talablariga mosligi", href: "/tizim-haqida#qaror" },
      {
        label: "Vebinarlar",
        children: [
          { label: "Onlayn vebinarlar", href: "/tizim-haqida#vebinarlar" },
          { label: "Yozib olingan", href: "/tizim-haqida#yozilgan" },
        ],
      },
      { label: "Yangiliklar", href: "/tizim-haqida#yangiliklar" },
      { label: "Hamkorlar", href: "/tizim-haqida#hamkorlar" },
      { label: "Savol-javoblar", href: "/tizim-haqida#faq" },
    ],
  },
  {
    label: "Foydalanuvchilarga",
    href: "/foydalanuvchilarga",
  },
  {
    label: "Tashkilotlarga",
    href: "/tashkilotlarga",
  },
  {
    label: "Yordam",
    children: [
      { label: "Yo'riqnomalar", href: "/yordam/qollanmalar" },
      { label: "Video qo'llanmalar", href: "/yordam/video" },
      { label: "Bog'lanish", href: "/yordam/boglanish" },
    ],
  },
] as const;

type NavChild = {
  label: string;
  href?: string;
  children?: readonly { label: string; href: string }[];
};

type NavItem = {
  label: string;
  href?: string;
  children?: readonly NavChild[];
};

function NavDropdown({ item }: { item: NavItem }) {
  if (!item.children) {
    return (
      <Link
        to={item.href ?? "#"}
        className="text-sm font-semibold uppercase tracking-wide text-foreground/80 hover:text-primary transition-colors px-1"
      >
        {item.label}
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 text-sm font-semibold uppercase tracking-wide text-primary hover:text-primary/80 transition-colors focus:outline-none">
          {item.label}
          <ChevronDown className="h-3.5 w-3.5 mt-0.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 shadow-lg rounded-xl border border-border/60 bg-white/95 backdrop-blur">
        {item.children.map((child) => {
          if ("children" in child && child.children) {
            return (
              <DropdownMenuSub key={child.label}>
                <DropdownMenuSubTrigger className="cursor-pointer">
                  {child.label}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="rounded-xl shadow-lg border border-border/60 bg-white/95">
                  {child.children.map((sub) => (
                    <DropdownMenuItem key={sub.label} asChild>
                      <Link to={sub.href} className="cursor-pointer">
                        {sub.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            );
          }
          return (
            <DropdownMenuItem key={child.label} asChild>
              <Link to={child.href ?? "#"} className="cursor-pointer">
                {child.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LandingNav() {
  const { t, i18n } = useTranslation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const currentLang =
    LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "bg-white/95 shadow-sm backdrop-blur"
          : "bg-white/80 backdrop-blur"
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4 gap-4">
        {/* Logo */}
        <Link
          to="/"
          className="text-xl font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md shrink-0"
          aria-label="Arab Exam home"
        >
          Arab Exam
        </Link>

        {/* Asosiy navigatsiya */}
        <nav className="hidden md:flex items-center gap-6 flex-1 justify-center">
          {(NAV_ITEMS as readonly NavItem[]).map((item) => (
            <NavDropdown key={item.label} item={item} />
          ))}
        </nav>

        {/* O'ng tomon: til + login + start */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Til tanlash */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-sm font-medium min-w-[6rem] justify-between"
                aria-label="Select language"
              >
                <span>{currentLang.label}</span>
                <ChevronDown className="h-4 w-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => i18n.changeLanguage(lang.code)}
                  className={cn(i18n.language === lang.code && "bg-accent")}
                >
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            to="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
          >
            {t("nav.login")}
          </Link>

          <Button asChild size="default" className="rounded-lg shadow-sm">
            <Link to="/register">{t("nav.startDemo")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
