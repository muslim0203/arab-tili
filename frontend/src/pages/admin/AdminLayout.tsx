import { Link, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  ArrowLeft,
  FileText,
  BookOpen,
  Headphones,
  PenTool,
  Mic,
  Menu,
  X,
} from "lucide-react";

const nav = [
  { to: "/admin", label: "Statistika", icon: LayoutDashboard },
  { to: "/admin/users", label: "Foydalanuvchilar", icon: Users },
  { to: "/admin/payments", label: "To'lovlar", icon: CreditCard },
  { label: "divider" },
  { to: "/admin/grammar", label: "Grammatika", icon: FileText },
  { to: "/admin/reading", label: "O'qish (Reading)", icon: BookOpen },
  { to: "/admin/listening", label: "Tinglash (Listening)", icon: Headphones },
  { to: "/admin/writing", label: "Yozish (Writing)", icon: PenTool },
  { to: "/admin/speaking", label: "Gapirish (Speaking)", icon: Mic },
];

function AdminNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();

  return (
    <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
      {nav.map((item, i) => {
        if (item.label === "divider") {
          return (
            <div key={i} className="my-2 border-t border-border">
              <p className="text-xs text-muted-foreground font-medium px-3 pt-3 pb-1">
                Savol banki
              </p>
            </div>
          );
        }
        const Icon = item.icon!;
        const isActive =
          item.to === "/admin"
            ? location.pathname === "/admin"
            : location.pathname.startsWith(item.to!);
        return (
          <Button
            key={item.to}
            variant={isActive ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start rounded-xl min-h-[44px]",
              isActive && "font-medium"
            )}
            asChild
            onClick={onNavigate}
          >
            <Link to={item.to!} className="flex items-center gap-3">
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}

export function AdminLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sahifa o'zgarganda mobil drawer'ni yopish
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Mobil top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4 sm:hidden">
        <Link
          to="/admin"
          className="font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg text-base"
        >
          🛡️ Admin Panel
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="min-h-[44px] min-w-[44px]"
          aria-label={mobileOpen ? "Menyuni yopish" : "Menyuni ochish"}
          aria-expanded={mobileOpen}
          aria-controls="admin-mobile-drawer"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobil drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 sm:hidden"
          aria-hidden
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobil drawer */}
      <aside
        id="admin-mobile-drawer"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-300 sm:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <Link
              to="/admin"
              className="font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg text-lg"
              onClick={() => setMobileOpen(false)}
            >
              🛡️ Admin Panel
            </Link>
            <p className="text-xs text-muted-foreground mt-0.5">At-Ta'anul Question Bank</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="min-h-[44px] min-w-[44px] shrink-0"
            aria-label="Menyuni yopish"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <AdminNavLinks onNavigate={() => setMobileOpen(false)} />
        <div className="border-t border-border p-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start rounded-xl gap-2 min-h-[44px]"
            asChild
            onClick={() => setMobileOpen(false)}
          >
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card sm:flex">
        <div className="border-b border-border p-4">
          <Link
            to="/admin"
            className="font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg text-lg"
          >
            🛡️ Admin Panel
          </Link>
          <p className="text-xs text-muted-foreground mt-0.5">At-Ta'anul Question Bank</p>
        </div>
        <AdminNavLinks />
        <div className="border-t border-border p-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start rounded-xl gap-2"
            asChild
          >
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6 pt-20 sm:pt-6">
        <Outlet />
      </main>
    </div>
  );
}
