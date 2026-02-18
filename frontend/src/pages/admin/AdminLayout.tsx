import { Link, Outlet, useLocation } from "react-router-dom";
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

export function AdminLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-muted/30 flex">
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
                  "w-full justify-start rounded-xl",
                  isActive && "font-medium"
                )}
                asChild
              >
                <Link to={item.to!} className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>
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
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
