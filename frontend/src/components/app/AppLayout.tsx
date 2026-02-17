import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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
import { ChevronDown, LayoutDashboard, FileQuestion, MessageCircle, CreditCard, History, LogOut } from "lucide-react";

const APP_NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/exams", label: "Mock imtihonlar" },
  { to: "/ai-tutor", label: "AI Tutor" },
  { to: "/pricing", label: "Tariflar" },
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header
        className={cn(
          "sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur transition-shadow",
          scrolled && "shadow-sm"
        )}
      >
        <div className="container mx-auto flex h-14 items-center px-4 gap-4">
          <Link
            to="/dashboard"
            className="font-semibold text-primary shrink-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md"
          >
            AttanalPro
          </Link>
          <nav className="hidden md:flex flex-1 items-center gap-1">
            {APP_NAV.map((item) => (
              <Button
                key={item.to}
                variant="ghost"
                size="sm"
                asChild
                className="rounded-lg text-sm font-medium"
              >
                <Link to={item.to}>{item.label}</Link>
              </Button>
            ))}
            <Button variant="ghost" size="sm" asChild className="rounded-lg text-sm font-medium">
              <Link to="/attempts/history">Imtihonlar tarixi</Link>
            </Button>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user?.isAdmin && (
              <Button variant="ghost" size="sm" asChild className="rounded-lg">
                <Link to="/admin">Admin</Link>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-lg min-w-[120px] justify-between"
                  aria-label="Profil menyusi"
                >
                  <span className="truncate">{user?.fullName ?? "Profil"}</span>
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
                  <Link to="/exams" className="flex items-center gap-2 cursor-pointer">
                    <FileQuestion className="h-4 w-4" />
                    Mock imtihonlar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/ai-tutor" className="flex items-center gap-2 cursor-pointer">
                    <MessageCircle className="h-4 w-4" />
                    AI Tutor
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/pricing" className="flex items-center gap-2 cursor-pointer">
                    <CreditCard className="h-4 w-4" />
                    Tariflar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/attempts/history" className="flex items-center gap-2 cursor-pointer">
                    <History className="h-4 w-4" />
                    Imtihonlar tarixi
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
          </div>
        </div>
      </header>
      <main className={cn("container mx-auto px-4 py-6 sm:py-8", maxWidth)}>
        {children}
      </main>
    </div>
  );
}
