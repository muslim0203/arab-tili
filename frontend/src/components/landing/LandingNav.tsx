import { Link, useNavigate } from "react-router-dom";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import { ChevronDown, LayoutDashboard, Settings, LogOut, Menu, X } from "lucide-react";
import { useAuthStore } from "@/store/auth";

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
      <DropdownMenuContent align="start" className="w-56 shadow-lg rounded-xl border border-border/60 bg-popover/95 backdrop-blur">
        {item.children.map((child) => {
          if ("children" in child && child.children) {
            return (
              <DropdownMenuSub key={child.label}>
                <DropdownMenuSubTrigger className="cursor-pointer">
                  {child.label}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="rounded-xl shadow-lg border border-border/60 bg-popover/95">
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

function MobileNavChild({ child }: { child: NavChild }) {
  const [open, setOpen] = useState(false);

  if (child.children) {
    return (
      <li>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full min-h-[44px] items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-accent"
          aria-expanded={open}
        >
          {child.label}
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <ul className="ml-3 border-l border-border pl-3">
            {child.children.map((sub) => (
              <li key={sub.label}>
                <Link
                  to={sub.href}
                  className="flex min-h-[44px] items-center rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {sub.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <Link
        to={child.href ?? "#"}
        className="flex min-h-[44px] items-center rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        {child.label}
      </Link>
    </li>
  );
}

function MobileNavItem({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);

  if (!item.children) {
    return (
      <li>
        <Link
          to={item.href ?? "#"}
          className="flex min-h-[44px] items-center rounded-lg px-3 py-2.5 text-sm font-semibold uppercase tracking-wide text-foreground/80 hover:bg-accent"
        >
          {item.label}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-h-[44px] items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold uppercase tracking-wide text-primary hover:bg-accent"
        aria-expanded={open}
      >
        {item.label}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="ml-3 border-l border-border pl-3">
          {item.children.map((child) => (
            <MobileNavChild key={child.label} child={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function LandingNav() {
  const { t, i18n } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isAuthenticated());
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Sahifa o'zgarganda yoki katta ekranga o'tganda mobil menyuni yop
  useEffect(() => {
    if (!mobileOpen) return;
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mobileOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/", { replace: true });
    setMobileOpen(false);
  }, [logout, navigate]);

  const currentLang =
    LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "bg-background/95 shadow-sm backdrop-blur"
          : "bg-background/80 backdrop-blur"
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4 gap-4">
        {/* Logo */}
        <Link
          to="/"
          className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md shrink-0 flex items-center gap-2"
          aria-label="Arab Exam home"
        >
          <img src="/logo.png" alt="Arab Exam" className="h-10 w-auto object-contain" />
        </Link>

        {/* Asosiy navigatsiya */}
        <nav className="hidden md:flex items-center gap-6 flex-1 justify-center">
          {(NAV_ITEMS as readonly NavItem[]).map((item) => (
            <NavDropdown key={item.label} item={item} />
          ))}
        </nav>

        {/* O'ng tomon: til + auth (desktop) + mobil burger */}
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

          {/* Auth qismi: login holatda — user dropdown, aks holda — Login/Register */}
          {isLoggedIn && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-lg min-w-[100px] sm:min-w-[120px] justify-between"
                  aria-label="Profil menyusi"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                      {user.fullName?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                    <span className="truncate max-w-[80px] sm:max-w-[120px] text-sm font-medium">
                      {user.fullName}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="h-4 w-4" />
                    Sozlamalar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Chiqish
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
              >
                {t("nav.login")}
              </Link>

              <Button asChild size="default" className="rounded-lg shadow-sm">
                <Link to="/register">{t("nav.startDemo")}</Link>
              </Button>
            </>
          )}

          {/* Mobil burger tugma */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden min-h-[44px] min-w-[44px]"
            aria-label={mobileOpen ? "Menyuni yopish" : "Menyuni ochish"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-panel"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobil navigatsiya paneli */}
      {mobileOpen && (
        <div
          id="mobile-nav-panel"
          className="md:hidden border-t border-border bg-background max-h-[calc(100vh-4rem)] overflow-y-auto"
        >
          <ul className="container mx-auto flex flex-col gap-1 px-4 py-3">
            {(NAV_ITEMS as readonly NavItem[]).map((item) => (
              <MobileNavItem key={item.label} item={item} />
            ))}
          </ul>
          <div className="container mx-auto flex flex-col gap-2 border-t border-border px-4 py-4">
            {!isLoggedIn && (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="flex min-h-[44px] items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-accent"
              >
                {t("nav.login")}
              </Link>
            )}
            <Button
              asChild
              size="default"
              className="min-h-[44px] w-full rounded-lg shadow-sm"
              onClick={() => setMobileOpen(false)}
            >
              <Link to={isLoggedIn ? "/dashboard" : "/register"}>
                {isLoggedIn ? "Dashboard" : t("nav.startDemo")}
              </Link>
            </Button>
            {isLoggedIn && (
              <Button
                variant="outline"
                size="default"
                className="min-h-[44px] w-full rounded-lg gap-2"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Chiqish
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

