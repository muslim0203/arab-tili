import { Outlet } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuthStore } from "@/store/auth";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function MainLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleLangChange = (code: string) => {
    i18n.changeLanguage(code);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader
        lang={i18n.language}
        onLangChange={handleLangChange}
        showAuth
        user={user}
        onLogout={handleLogout}
      />
      <main className="container mx-auto px-4 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
