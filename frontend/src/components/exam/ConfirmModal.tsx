// ─────────────────────────────────────────────────
// ConfirmModal – oddiy tasdiq modali (shadcn alert-dialog o'rniga)
// Imtihon oqimida xavfli amallar oldidan tasdiq so'rash uchun
// ─────────────────────────────────────────────────

import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmModal({
    open,
    title,
    description,
    confirmLabel = "Davom etish",
    cancelLabel = "Bekor qilish",
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
        >
            <div className="max-w-sm w-full rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-card-foreground">{title}</h3>
                        {description && (
                            <p className="text-xs text-muted-foreground mt-1">{description}</p>
                        )}
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        autoFocus
                        className="flex-1 py-2.5 rounded-xl border border-border bg-card text-card-foreground font-semibold text-sm hover:bg-muted/50 transition-all"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="flex-1 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold text-sm hover:bg-amber-500/25 transition-all"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
