import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";

export function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
            <SEO title="Sahifa topilmadi" noindex />
            <div className="max-w-lg w-full text-center space-y-8">
                {/* 404 Raqam */}
                <div className="relative">
                    <span className="text-[10rem] font-extrabold leading-none text-primary/10 select-none">
                        404
                    </span>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                            <svg
                                className="h-10 w-10 text-primary"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15.182 16.318A4.486 4.486 0 0 0 12.016 15a4.486 4.486 0 0 0-3.198 1.318M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z"
                                />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Matn */}
                <div className="space-y-3">
                    <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                        Sahifa topilmadi
                    </h1>
                    <p className="text-muted-foreground text-base max-w-sm mx-auto">
                        Siz qidirayotgan sahifa mavjud emas, o'chirilgan yoki manzil noto'g'ri kiritilgan bo'lishi mumkin.
                    </p>
                </div>

                {/* Harakatlar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                        <svg
                            className="mr-2 h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                            />
                        </svg>
                        Bosh sahifaga
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-all hover:bg-muted hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                        <svg
                            className="mr-2 h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
                            />
                        </svg>
                        Orqaga qaytish
                    </button>
                </div>
            </div>
        </div>
    );
}
