import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useTranslation } from "react-i18next";
import { SEO } from "@/components/SEO";
import { StructuredData, buildBreadcrumbSchema } from "@/components/StructuredData";
import { Send, Mail, MessageCircle, CheckCircle2, Loader2 } from "lucide-react";

const TELEGRAM_GROUP = "https://t.me/arabexam_uz";
const TELEGRAM_CHANNEL = "https://t.me/arabexam_kanal";
const SUPPORT_EMAIL = "support@arabexam.uz";

export function Boglanish() {
  const { i18n } = useTranslation();

  const [form, setForm] = useState({ fullName: "", phone: "", message: "" });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [serverMsg, setServerMsg] = useState("");

  function validate() {
    const e: Partial<typeof form> = {};
    if (!form.fullName.trim()) e.fullName = "Ismingizni kiriting";
    if (!form.message.trim()) e.message = "Xabar matnini kiriting";
    else if (form.message.trim().length < 10) e.message = "Kamida 10 ta belgi kiriting";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStatus("loading");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setServerMsg(data.message);
        setForm({ fullName: "", phone: "", message: "" });
      } else {
        setStatus("error");
        setServerMsg(data.message ?? "Xato yuz berdi");
      }
    } catch {
      setStatus("error");
      setServerMsg("Serverga ulanib bo'lmadi. Iltimos, qayta urinib ko'ring.");
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((p) => ({ ...p, [name]: undefined }));
    }
    if (status !== "idle") setStatus("idle");
  }

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #f8faff 0%, #eef2ff 100%)" }}>
      <SEO
        title="Bog'lanish – Arab Exam"
        description="Arab Exam bilan bog'lanish – savol, taklif va hamkorlik bo'yicha murojaat qiling."
        canonicalPath="/yordam/boglanish"
        lang={i18n.language}
      />
      <StructuredData
        data={buildBreadcrumbSchema([
          { name: "Bosh sahifa", url: "https://arabexam.uz/" },
          { name: "Yordam", url: "https://arabexam.uz/yordam" },
          { name: "Bog'lanish", url: "https://arabexam.uz/yordam/boglanish" },
        ])}
      />
      <SiteHeader lang={i18n.language} onLangChange={(code) => i18n.changeLanguage(code)} />

      <main className="container mx-auto max-w-2xl px-4 py-16">
        {/* Sarlavha */}
        <div className="text-center mb-12 relative">
          <p
            className="absolute inset-0 flex items-center justify-center text-[72px] font-black tracking-widest select-none pointer-events-none"
            style={{ color: "rgba(0,0,0,0.04)", lineHeight: 1 }}
            aria-hidden
          >
            BOG'LANISH
          </p>
          <h1 className="relative text-3xl font-bold tracking-tight text-gray-900 mb-3">
            BIZ BILAN BOG'LANISH
          </h1>
          <p className="relative text-gray-500 text-sm">
            Bizga yozing va tez orada siz bilan bog'lanamiz.
          </p>
        </div>

        {/* Aloqa linklari */}
        <div className="flex flex-wrap justify-center gap-6 mb-10">
          <a
            href={TELEGRAM_GROUP}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 text-[#2196F3] font-medium text-sm hover:opacity-80 transition-opacity"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2196F3] text-white shadow">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </span>
            Telegram rasmiy guruhimiz
          </a>

          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex items-center gap-2.5 text-[#2196F3] font-medium text-sm hover:opacity-80 transition-opacity"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2196F3] text-white shadow">
              <Mail className="h-5 w-5" />
            </span>
            {SUPPORT_EMAIL}
          </a>

          <a
            href={TELEGRAM_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 text-[#2196F3] font-medium text-sm hover:opacity-80 transition-opacity"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2196F3] text-white shadow">
              <MessageCircle className="h-5 w-5" />
            </span>
            Telegram rasmiy kanalimiz
          </a>
        </div>

        {/* Forma */}
        <form onSubmit={handleSubmit} noValidate className="space-y-0" id="contact-form">
          {/* To'liq ism */}
          <div className="border-b border-gray-200">
            <input
              id="contact-fullName"
              name="fullName"
              type="text"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Sizning to'liq ismingiz"
              className="w-full bg-transparent px-0 py-4 text-sm text-gray-700 placeholder-gray-400 outline-none"
              autoComplete="name"
            />
            {errors.fullName && (
              <p className="text-xs text-red-500 pb-1">{errors.fullName}</p>
            )}
          </div>

          {/* Telefon */}
          <div className="border-b border-gray-200">
            <input
              id="contact-phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="Sizning telefoningiz"
              className="w-full bg-transparent px-0 py-4 text-sm text-gray-700 placeholder-gray-400 outline-none"
              autoComplete="tel"
            />
          </div>

          {/* Xabar */}
          <div className="border-b border-gray-200">
            <textarea
              id="contact-message"
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="Xabaringiz"
              rows={4}
              className="w-full bg-transparent px-0 py-4 text-sm text-gray-700 placeholder-gray-400 outline-none resize-none"
            />
            {errors.message && (
              <p className="text-xs text-red-500 pb-1">{errors.message}</p>
            )}
          </div>

          {/* Muvaffaqiyat/xato xabari */}
          {status === "success" && (
            <div className="flex items-center gap-2.5 rounded-xl bg-green-50 border border-green-200 px-4 py-3 mt-4">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              <p className="text-sm text-green-700">{serverMsg}</p>
            </div>
          )}
          {status === "error" && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 mt-4">
              <p className="text-sm text-red-600">{serverMsg}</p>
            </div>
          )}

          {/* Yuborish tugmasi */}
          <div className="flex justify-center pt-8">
            <button
              type="submit"
              id="contact-submit"
              disabled={status === "loading" || status === "success"}
              className="flex items-center gap-2 rounded-full px-10 py-3 text-sm font-semibold text-white shadow-lg transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(90deg, #2196F3 0%, #1565C0 100%)" }}
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Yuborilmoqda...
                </>
              ) : status === "success" ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Yuborildi!
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  JO'NATISH
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
