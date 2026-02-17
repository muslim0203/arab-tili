import { useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useThemeStore, applyTheme } from "@/store/theme";

const OPTIONS = [
    { value: "light" as const, label: "Kunduzgi", icon: Sun },
    { value: "dark" as const, label: "Tungi", icon: Moon },
    { value: "system" as const, label: "Tizim", icon: Monitor },
];

export function ThemeToggle() {
    const theme = useThemeStore((s) => s.theme);
    const setTheme = useThemeStore((s) => s.setTheme);

    // Theme o'zgarganda DOM yangilanadi
    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    // System prefers-color-scheme o'zgarganda
    useEffect(() => {
        if (theme !== "system") return;
        const mql = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => applyTheme("system");
        mql.addEventListener("change", handler);
        return () => mql.removeEventListener("change", handler);
    }, [theme]);

    const CurrentIcon = OPTIONS.find((o) => o.value === theme)?.icon ?? Monitor;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-lg p-0"
                    aria-label="Mavzuni o'zgartirish"
                >
                    <CurrentIcon className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl w-40">
                {OPTIONS.map((opt) => (
                    <DropdownMenuItem
                        key={opt.value}
                        onClick={() => setTheme(opt.value)}
                        className="flex items-center gap-2 cursor-pointer"
                    >
                        <opt.icon className="h-4 w-4" />
                        {opt.label}
                        {theme === opt.value && (
                            <span className="ml-auto text-primary text-xs">✓</span>
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
