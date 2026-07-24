import fs from "fs";
import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const SITE_URL = "https://arabexam.uz";
const SITE_NAME = "Arab Exam";

/**
 * Har bir ommaviy (indekslanadigan) yo'l uchun statik HTML fayl yaratadi va
 * unga sahifaga xos <title>, description, canonical va OpenGraph teglarini
 * joylashtiradi.
 *
 * Nega kerak: ilova — CSR SPA (react-helmet-async). Meta teglar faqat JS
 * ishga tushgach o'rnatiladi. Telegram, Facebook, WhatsApp kabi ijtimoiy
 * crawlerlar JS ni bajarmaydi — ular faqat statik HTML ni o'qiydi. Bu plugin
 * ularga to'g'ri per-page meta beradi (O'zbekistonda Telegram ulashish muhim).
 *
 * Vercel `cleanUrls: true` bilan `/tizim-haqida` -> `dist/tizim-haqida/index.html`
 * statik fayli xizmat qiladi; qolgan (dinamik) yo'llar SPA fallback'ga tushadi.
 */
function seoPrerender(): Plugin {
  const routes: Array<{ path: string; title: string; description: string }> = [
    {
      path: "/tizim-haqida",
      title: "Tizim haqida",
      description:
        "Arab Exam platformasi haqida: CEFR asosida arab tili baholash, 5 bo'lim (listening, reading, language use, writing, speaking), AI tutor.",
    },
    {
      path: "/foydalanuvchilarga",
      title: "Foydalanuvchilarga",
      description:
        "Talabalar va o'quvchilar uchun arab tili CEFR mock imtihoniga tayyorgarlik: listening, reading, writing, speaking bo'limlari, AI tutor va batafsil natijalar.",
    },
    {
      path: "/tashkilotlarga",
      title: "Tashkilotlarga",
      description:
        "Maktab, universitet va test markazlari uchun arab tili CEFR imtihon platformasi. Guruh obunalari, o'qituvchi paneli va natijalar monitoring.",
    },
    {
      path: "/yordam",
      title: "Yordam markazi",
      description:
        "Arab Exam platformasidan foydalanish bo'yicha yordam, qo'llanmalar, video darsliklar va bog'lanish ma'lumotlari.",
    },
    {
      path: "/yordam/boglanish",
      title: "Bog'lanish",
      description:
        "Arab Exam bilan bog'lanish – savol, taklif va hamkorlik bo'yicha murojaat qiling.",
    },
    {
      path: "/yordam/qollanmalar",
      title: "Qo'llanmalar",
      description:
        "Arab Exam foydalanuvchi qo'llanmalari va mock imtihon qoidalari (PDF). Tizimdan foydalanish bo'yicha ko'rsatmalar.",
    },
    {
      path: "/yordam/video",
      title: "Video qo'llanmalar",
      description:
        "Arab Exam platformasidan foydalanish bo'yicha video darsliklar: ro'yxatdan o'tish, mock imtihon topshirish va AI Tutor bilan ishlash.",
    },
    // Ochiq bilim bazasi — SEO o'quv kontenti
    {
      path: "/organ",
      title: "Arab tili bilim bazasi — bepul darslar",
      description:
        "Arab tilini noldan o'rganish uchun bepul darslar: alifbo, harakatlar, grammatika va CEFR imtihoniga tayyorgarlik. O'zbek tilida, misollar bilan.",
    },
    {
      path: "/organ/arab-alifbosi",
      title: "Arab alifbosi — 28 harf, o'qilishi va yozilishi",
      description:
        "Arab alifbosidagi 28 harf, ularning o'qilishi, yozuv shakllari va o'ngdan chapga yozuv qoidalari. Boshlang'ich (A1) uchun to'liq qo'llanma va misollar.",
    },
    {
      path: "/organ/arab-harakatlari",
      title: "Arab harakatlari — fatha, kasra, damma, sukun",
      description:
        "Arab tilidagi harakatlar (fatha, kasra, damma, sukun, shadda, tanvin) nima va ular so'z o'qilishini qanday belgilaydi. A1 daraja uchun misollar bilan qo'llanma.",
    },
  ];

  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  return {
    name: "seo-prerender",
    apply: "build",
    closeBundle() {
      const dist = path.resolve(__dirname, "dist");
      const indexPath = path.join(dist, "index.html");
      if (!fs.existsSync(indexPath)) return;
      const template = fs.readFileSync(indexPath, "utf-8");

      for (const r of routes) {
        const canonical = `${SITE_URL}${r.path}`;
        const fullTitle = `${r.title} | ${SITE_NAME}`;
        const desc = esc(r.description);
        const html = template
          .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(fullTitle)}</title>`)
          .replace(
            /<meta name="description"[^>]*>/,
            `<meta name="description" content="${desc}" />`
          )
          .replace(
            /<link rel="canonical"[^>]*>/,
            `<link rel="canonical" href="${canonical}" />`
          )
          .replace(
            /<meta property="og:title"[^>]*>/,
            `<meta property="og:title" content="${esc(fullTitle)}" />`
          )
          .replace(
            /<meta property="og:description"[^>]*>/,
            `<meta property="og:description" content="${desc}" />`
          )
          .replace(
            /<meta property="og:url"[^>]*>/,
            `<meta property="og:url" content="${canonical}" />`
          )
          .replace(
            /<meta name="twitter:title"[^>]*>/,
            `<meta name="twitter:title" content="${esc(fullTitle)}" />`
          )
          .replace(
            /<meta name="twitter:description"[^>]*>/,
            `<meta name="twitter:description" content="${desc}" />`
          );

        const outDir = path.join(dist, r.path);
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(path.join(outDir, "index.html"), html, "utf-8");
      }

      // eslint-disable-next-line no-console
      console.log(
        `[seo-prerender] ${routes.length} ta yo'l uchun statik meta HTML yaratildi.`
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), seoPrerender()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          i18n: ["i18next", "react-i18next"],
          charts: ["recharts"],
        },
      },
    },
  },
  server: {
    host: "localhost",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
