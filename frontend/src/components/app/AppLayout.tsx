import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  LayoutDashboard,
  FileQuestion,
  MessageCircle,
  CreditCard,
  History,
  LogOut,
  Menu,
  X,
  Settings,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const APP_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/exams", label: "Mock imtihonlar", icon: FileQuestion },
  { to: "/ai-tutor", label: "AI Tutor", icon: MessageCircle },
  { to: "/pricing", label: "Tariflar", icon: CreditCard },
  { to: "/attempts/history", label: "Imtihonlar tarixi", icon: History },
] as const;

interface AppLayoutProps {
  children: React.ReactNode;
  /** Max width of main content. Default: max-w-4xl */
  maxWidth?: "max-w-2xl" | "max-w-4xl" | "max-w-6xl";
}

export function AppLayout({ children, maxWidth = "max-w-4xl" }: AppLayoutProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Sahifa o'zgarganda mobil menyuni yopish
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Escape tugmasi bilan yopish
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  // Body scroll lock
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  return (
    <div className="min-h-screen bg-muted/30">
      <header
        className={cn(
          "sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur transition-shadow",
          scrolled && "shadow-sm"
        )}
      >
        <div className="container mx-auto flex h-14 items-center px-4 gap-4">
          {/* Mobil burger tugmasi */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden shrink-0 -ml-2"
            onClick={() => setMobileOpen(true)}
            aria-label="Menyuni ochish"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link
            to="/dashboard"
            className="font-semibold text-primary shrink-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md"
          >
            AttanalPro
          </Link>

          {/* Desktop navigatsiya */}
          <nav className="hidden md:flex flex-1 items-center gap-1">
            {APP_NAV.map((item) => (
              <Button
                key={item.to}
                variant={location.pathname === item.to ? "secondary" : "ghost"}
                size="sm"
                asChild
                className="rounded-lg text-sm font-medium"
              >
                <Link to={item.to}>{item.label}</Link>
              </Button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {user?.isAdmin && (
              <Button variant="ghost" size="sm" asChild className="rounded-lg hidden sm:inline-flex">
                <Link to="/admin">Admin</Link>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-lg min-w-[100px] sm:min-w-[120px] justify-between"
                  aria-label="Profil menyusi"
                >
                  <span className="truncate max-w-[80px] sm:max-w-none">{user?.fullName ?? "Profil"}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                {APP_NAV.map((item) => (
                  <DropdownMenuItem key={item.to} asChild>
                    <Link to={item.to} className="flex items-center gap-2 cursor-pointer">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="h-4 w-4" />
                    Sozlamalar
                  </Link>
                </DropdownMenuItem>
                {user?.isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                        <LayoutDashboard className="h-4 w-4" />
                        Admin panel
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
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
          </div>
        </div>
      </header>

      {/* ============ MOBIL DRAWER ============ */}
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      {/* Drawer panel */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-[70] h-full w-72 bg-card border-r border-border shadow-2xl transition-transform duration-300 ease-in-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Link to="/dashboard" className="font-semibold text-primary text-lg">
            AttanalPro
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Menyuni yopish"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {APP_NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors touch-manipulation",
                location.pathname === item.to
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          ))}

          <Link
            to="/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors touch-manipulation",
              location.pathname === "/settings"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />
            Sozlamalar
          </Link>

          {user?.isAdmin && (
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors touch-manipulation",
                location.pathname.startsWith("/admin")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <LayoutDashboard className="h-5 w-5 shrink-0" />
              Admin panel
            </Link>
          )}
        </nav>

        {/* Foydalanuvchi info + chiqish */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
              {user?.fullName?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.fullName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full rounded-xl gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Chiqish
          </Button>
        </div>
      </aside>

      <main className={cn("container mx-auto px-4 py-6 sm:py-8", maxWidth)}>
        {children}
      </main>
    </div>
  );
}
