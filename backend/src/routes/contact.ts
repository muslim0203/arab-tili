import { Router } from "express";
import { config } from "../config.js";

export const contactRoutes = Router();

interface ContactBody {
    fullName: string;
    phone?: string;
    message: string;
}

// POST /api/contact
contactRoutes.post("/", async (req, res) => {
    const { fullName, phone, message } = req.body as ContactBody;

    // Validatsiya
    if (!fullName?.trim()) {
        res.status(400).json({ message: "To'liq ismingizni kiriting." });
        return;
    }
    if (!message?.trim()) {
        res.status(400).json({ message: "Xabar matnini kiriting." });
        return;
    }
    if (message.trim().length < 10) {
        res.status(400).json({ message: "Xabar kamida 10 ta belgidan iborat bo'lishi kerak." });
        return;
    }

    const text = [
        "📬 *Yangi murojaat – Arab Exam*",
        "",
        `👤 *Ism:* ${fullName.trim()}`,
        phone ? `📞 *Telefon:* ${phone.trim()}` : null,
        `💬 *Xabar:*\n${message.trim()}`,
        "",
        `🕐 ${new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}`,
    ]
        .filter(Boolean)
        .join("\n");

    const { botToken, chatId } = config.telegram;

    if (botToken && chatId) {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: "Markdown",
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("Telegram xato:", err);
            res.status(500).json({ message: "Xabar yuborishda xato yuz berdi. Iltimos, qayta urinib ko'ring." });
            return;
        }
    } else {
        // Dev rejimi – Telegram sozlanmagan bo'lsa faqat log
        console.log("\n===== BOG'LANISH XABARI (dev) =====");
        console.log(text.replace(/\*/g, ""));
        console.log("====================================\n");
    }

    res.json({ ok: true, message: "Xabaringiz muvaffaqiyatli yuborildi! Tez orada siz bilan bog'lanamiz." });
});
