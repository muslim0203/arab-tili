import { Link, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, CreditCard, ArrowLeft, ClipboardList } from "lucide-react";

const nav = [
  { to: "/admin", label: "Statistika", icon: LayoutDashboard },
  { to: "/admin/users", label: "Foydalanuvchilar", icon: Users },
  { to: "/admin/payments", label: "To'lovlar", icon: CreditCard },
  { to: "/admin/question-bank", label: "Imtihon topshiriqlari", icon: ClipboardList },
];

export function AdminLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-muted/30 flex">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card sm:flex">
        <div className="border-b border-border p-4">
          <Link to="/admin" className="font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg">
            Admin
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => (
            <Button
              key={item.to}
              variant={location.pathname === item.to ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start rounded-xl",
                location.pathname === item.to && "font-medium"
              )}
              asChild
            >
              <Link to={item.to} className="flex items-center gap-3">
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <Button variant="outline" size="sm" className="w-full justify-start rounded-xl gap-2" asChild>
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
