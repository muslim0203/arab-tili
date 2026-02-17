import { Link, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "TIZIM HAQIDA",
    href: "/tizim-haqida",
    hasDropdown: true,
    links: [
      { label: "Tizim haqida", href: "/tizim-haqida" },
    ],
  },
  { label: "FOYDALANUVCHILARGA", href: "/foydalanuvchilarga" },
  { label: "TASHKILOTLARGA", href: "/tashkilotlarga" },
  {
    label: "YORDAM",
    href: "/yordam",
    hasDropdown: true,
    links: [
      { label: "Bog'lanish", href: "/yordam/boglanish" },
      { label: "Qo'llanmalar (pdf)", href: "/yordam/qollanmalar" },
      { label: "Video qo'llanmalar", href: "/yordam/video" },
    ],
  },
];

const languages = [
  { code: "uz", label: "O'ZBEKCHA", flag: "🇺🇿" },
  { code: "ru", label: "RUSCHA", flag: "🇷🇺" },
  { code: "ar", label: "ARABCHA", flag: "🇸🇦" },
];

type SiteHeaderProps = {
  lang?: string;
  onLangChange?: (code: string) => void;
  showAuth?: boolean;
  user?: { fullName?: string } | null;
  onLogout?: () => void;
};

export function SiteHeader({
  lang = "uz",
  onLangChange,
  showAuth = false,
  user,
  onLogout,
}: SiteHeaderProps) {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === "/yordam") return location.pathname.startsWith("/yordam");
    return location.pathname === href || location.pathname.startsWith(href + "/");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card">
      <div className="container mx-auto flex h-14 items-center px-4 gap-4">
        <Link
          to="/dashboard"
          className="font-semibold text-primary shrink-0 mr-2"
        >
          AttanalPro
        </Link>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {navItems.map((item) => {
            if (item.hasDropdown && item.links) {
              const active = isActive(item.href);
              return (
                <DropdownMenu key={item.label}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary",
                        active && "bg-primary/10 text-primary"
                      )}
                    >
                      {item.label}
                      <ChevronDown className="h-4 w-4 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[200px]">
                    {item.links.map((link) => (
                      <DropdownMenuItem key={link.href} asChild>
                        <Link
                          to={link.href}
                          className="flex items-center justify-between w-full cursor-pointer"
                        >
                          {link.label}
                          <ChevronRight className="h-4 w-4 opacity-60" />
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }
            const active = isActive(item.href);
            return (
              <Button
                key={item.label}
                variant="ghost"
                size="sm"
                asChild
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium",
                  active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-primary/10 hover:text-primary"
                )}
              >
                <Link to={item.href}>{item.label}</Link>
              </Button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1.5 text-sm font-medium"
              >
                <span className="text-lg" role="img" aria-hidden>
                  {languages.find((l) => l.code === lang)?.flag ?? "🇺🇿"}
                </span>
                <span className="hidden sm:inline">
                  {languages.find((l) => l.code === lang)?.label ?? "O'ZBEKCHA"}
                </span>
                <ChevronDown className="h-4 w-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {languages.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  onClick={() => onLangChange?.(l.code)}
                  className={cn(lang === l.code && "bg-accent")}
                >
                  <span className="mr-2">{l.flag}</span>
                  {l.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {showAuth && (
            <>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      {user.fullName ?? "Profil"}
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard">Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/exams">Imtihonlar</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onLogout}>
                      Chiqish
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="default" size="sm" asChild>
                  <Link to="/login">Kirish</Link>
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
