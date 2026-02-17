import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { User, Lock, Globe, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/app/AppLayout";
import { PageHeader } from "@/components/app/PageHeader";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

type Profile = {
    id: string;
    email: string;
    fullName: string;
    languagePreference: string;
    subscriptionTier: string;
    subscriptionExpiresAt: string | null;
    isAdmin: boolean;
    createdAt: string;
};

// Profile form
const profileSchema = z.object({
    fullName: z.string().min(1, "Ism kiritilishi shart").max(100),
    languagePreference: z.enum(["uz", "ru", "ar"]),
});
type ProfileForm = z.infer<typeof profileSchema>;

// Password form
const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Joriy parol kiritilishi shart"),
    newPassword: z.string().min(6, "Kamida 6 belgi"),
    confirmPassword: z.string().min(6, "Tasdiqlash parolini kiriting"),
}).refine((d) => d.newPassword === d.confirmPassword, {
    message: "Parollar mos kelmaydi",
    path: ["confirmPassword"],
});
type PasswordForm = z.infer<typeof passwordSchema>;

const THEME_OPTIONS = [
    { value: "light" as const, label: "Kunduzgi", icon: Sun },
    { value: "dark" as const, label: "Tungi", icon: Moon },
    { value: "system" as const, label: "Tizim", icon: Monitor },
];

const LANG_OPTIONS = [
    { value: "uz", label: "O'zbekcha" },
    { value: "ru", label: "Русский" },
    { value: "ar", label: "العربية" },
];

export function Settings() {
    const queryClient = useQueryClient();
    const setAuth = useAuthStore((s) => s.setAuth);
    const user = useAuthStore((s) => s.user);
    const accessToken = useAuthStore((s) => s.accessToken);
    const refreshToken = useAuthStore((s) => s.refreshToken);
    const theme = useThemeStore((s) => s.theme);
    const setTheme = useThemeStore((s) => s.setTheme);
    const [activeTab, setActiveTab] = useState<"profile" | "password" | "appearance">("profile");

    const { data: profile, isLoading } = useQuery({
        queryKey: ["profile"],
        queryFn: () => api<Profile>("/profile"),
    });

    // Profile form
    const profileForm = useForm<ProfileForm>({
        resolver: zodResolver(profileSchema),
        values: profile ? {
            fullName: profile.fullName,
            languagePreference: profile.languagePreference as "uz" | "ru" | "ar",
        } : undefined,
    });

    const profileMut = useMutation({
        mutationFn: (data: ProfileForm) =>
            api<{ user: Profile }>("/profile", { method: "PUT", body: data }),
        onSuccess: (res) => {
            toast.success("Profil yangilandi");
            queryClient.invalidateQueries({ queryKey: ["profile"] });
            // Auth store'ni ham yangilash
            if (user && accessToken && refreshToken) {
                setAuth({ ...user, fullName: res.user.fullName, languagePreference: res.user.languagePreference } as Parameters<typeof setAuth>[0], accessToken, refreshToken);
            }
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Xatolik"),
    });

    // Password form
    const passwordForm = useForm<PasswordForm>({
        resolver: zodResolver(passwordSchema),
    });

    const passwordMut = useMutation({
        mutationFn: (data: { currentPassword: string; newPassword: string }) =>
            api("/profile/password", { method: "PUT", body: data }),
        onSuccess: () => {
            toast.success("Parol o'zgartirildi");
            passwordForm.reset();
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Xatolik"),
    });

    const TABS = [
        { id: "profile" as const, label: "Profil", icon: User },
        { id: "password" as const, label: "Parol", icon: Lock },
        { id: "appearance" as const, label: "Ko'rinish", icon: Globe },
    ];

    return (
        <AppLayout maxWidth="max-w-2xl">
            <PageHeader
                title="Sozlamalar"
                subtitle="Profil, xavfsizlik va ko'rinish sozlamalari"
            />

            {/* Tab navigatsiya */}
            <div className="flex gap-1 mb-6 bg-muted/50 p-1 rounded-xl">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                            activeTab === tab.id
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <tab.icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Profile tab */}
            {activeTab === "profile" && (
                <Card className="rounded-xl">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            Profil maʼlumotlari
                        </CardTitle>
                        <CardDescription>Ismingiz va til sozlamalarini o'zgartiring</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            </div>
                        ) : (
                            <form onSubmit={profileForm.handleSubmit((d) => profileMut.mutate(d))} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Email</label>
                                    <Input value={profile?.email ?? ""} disabled className="bg-muted/50" />
                                    <p className="text-xs text-muted-foreground">Email o'zgartirib bo'lmaydi</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">To'liq ism</label>
                                    <Input {...profileForm.register("fullName")} />
                                    {profileForm.formState.errors.fullName && (
                                        <p className="text-sm text-destructive">{profileForm.formState.errors.fullName.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Interfeys tili</label>
                                    <div className="flex gap-2">
                                        {LANG_OPTIONS.map((lang) => (
                                            <button
                                                key={lang.value}
                                                type="button"
                                                onClick={() => profileForm.setValue("languagePreference", lang.value as "uz" | "ru" | "ar")}
                                                className={cn(
                                                    "flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                                                    profileForm.watch("languagePreference") === lang.value
                                                        ? "border-primary bg-primary/10 text-primary"
                                                        : "border-border hover:border-primary/50"
                                                )}
                                            >
                                                {lang.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Account info */}
                                <div className="pt-4 border-t border-border space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Tarif</span>
                                        <span className="font-medium flex items-center gap-1">
                                            <Shield className="h-3.5 w-3.5" />
                                            {profile?.subscriptionTier ?? "FREE"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Ro'yxatdan o'tgan</span>
                                        <span>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("uz") : "—"}</span>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full rounded-xl"
                                    disabled={profileMut.isPending || !profileForm.formState.isDirty}
                                >
                                    {profileMut.isPending ? "Saqlanmoqda..." : "Saqlash"}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Password tab */}
            {activeTab === "password" && (
                <Card className="rounded-xl">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Lock className="h-5 w-5 text-primary" />
                            Parolni o'zgartirish
                        </CardTitle>
                        <CardDescription>Hisobingiz xavfsizligi uchun kuchli parol tanlang</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={passwordForm.handleSubmit((d) =>
                                passwordMut.mutate({ currentPassword: d.currentPassword, newPassword: d.newPassword })
                            )}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Joriy parol</label>
                                <Input type="password" {...passwordForm.register("currentPassword")} autoComplete="current-password" />
                                {passwordForm.formState.errors.currentPassword && (
                                    <p className="text-sm text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Yangi parol</label>
                                <Input type="password" {...passwordForm.register("newPassword")} autoComplete="new-password" />
                                {passwordForm.formState.errors.newPassword && (
                                    <p className="text-sm text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Yangi parolni tasdiqlash</label>
                                <Input type="password" {...passwordForm.register("confirmPassword")} autoComplete="new-password" />
                                {passwordForm.formState.errors.confirmPassword && (
                                    <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                                )}
                            </div>
                            <Button
                                type="submit"
                                className="w-full rounded-xl"
                                disabled={passwordMut.isPending}
                            >
                                {passwordMut.isPending ? "O'zgartirilmoqda..." : "Parolni o'zgartirish"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Appearance tab */}
            {activeTab === "appearance" && (
                <Card className="rounded-xl">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Globe className="h-5 w-5 text-primary" />
                            Ko'rinish sozlamalari
                        </CardTitle>
                        <CardDescription>Mavzu va ko'rinish turini tanlang</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <label className="text-sm font-medium">Mavzu</label>
                            <div className="grid grid-cols-3 gap-3">
                                {THEME_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setTheme(opt.value)}
                                        className={cn(
                                            "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                                            theme === opt.value
                                                ? "border-primary bg-primary/5 shadow-sm"
                                                : "border-border hover:border-primary/30"
                                        )}
                                    >
                                        <opt.icon className={cn(
                                            "h-6 w-6",
                                            theme === opt.value ? "text-primary" : "text-muted-foreground"
                                        )} />
                                        <span className={cn(
                                            "text-sm font-medium",
                                            theme === opt.value ? "text-primary" : "text-muted-foreground"
                                        )}>
                                            {opt.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </AppLayout>
    );
}
