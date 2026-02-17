import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Global React Error Boundary.
 * Render vaqtida yuzaga kelgan xatolarni ushlaydi va foydalanuvchiga xato sahifasini ko'rsatadi.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error("ErrorBoundary caught:", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
                    <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 shadow-lg text-center space-y-6">
                        {/* Icon */}
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                            <svg
                                className="h-8 w-8 text-destructive"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                                />
                            </svg>
                        </div>

                        {/* Content */}
                        <div className="space-y-2">
                            <h2 className="text-xl font-semibold text-foreground">
                                Kutilmagan xato yuz berdi
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Dastur ishida xatolik yuzaga keldi. Iltimos, sahifani yangilang yoki
                                qayta urinib ko'ring.
                            </p>
                        </div>

                        {/* Error details (dev mode) */}
                        {import.meta.env.DEV && this.state.error && (
                            <details className="text-left rounded-lg border border-border bg-muted/50 p-3">
                                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                                    Texnik tafsilotlar
                                </summary>
                                <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-destructive">
                                    {this.state.error.message}
                                    {"\n\n"}
                                    {this.state.error.stack}
                                </pre>
                            </details>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <button
                                onClick={this.handleReset}
                                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            >
                                Qayta urinish
                            </button>
                            <button
                                onClick={() => (window.location.href = "/")}
                                className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            >
                                Bosh sahifaga qaytish
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
