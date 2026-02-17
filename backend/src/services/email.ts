import nodemailer from "nodemailer";
import { config } from "../config.js";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  const { host, port, secure, user, pass } = config.smtp;
  if (!host || !user || !pass) return null;
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  return transporter;
}

export function isEmailConfigured(): boolean {
  return !!(config.smtp.host && config.smtp.user && config.smtp.pass);
}

/**
 * Parolni tiklash havolasi bilan email yuboradi.
 */
export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<boolean> {
  const trans = getTransporter();
  if (!trans) return false;
  try {
    await trans.sendMail({
      from: config.smtp.from,
      to,
      subject: "AttanalPro – Parolni tiklash",
      text: `Parolni tiklash uchun quyidagi havolani bosing (1 soat amal qiladi):\n\n${resetLink}\n\nAgar siz bu so'rovni yubormagan bo'lsangiz, bu xatni e'tiborsiz qoldiring.`,
      html: `
        <p>Parolni tiklash uchun quyidagi tugmani bosing (havola 1 soat amal qiladi):</p>
        <p><a href="${resetLink}" style="display:inline-block; padding:10px 20px; background:#0d9488; color:white; text-decoration:none; border-radius:6px;">Parolni tiklash</a></p>
        <p>Yoki havolani brauzerga nusxalang: ${resetLink}</p>
        <p>Agar siz bu so'rovni yubormagan bo'lsangiz, bu xatni e'tiborsiz qoldiring.</p>
      `,
    });
    return true;
  } catch (err) {
    console.error("Email (password reset) xatosi:", err);
    return false;
  }
}

/**
 * Obuna tugashiga yaqinligi haqida eslatma yuboradi.
 */
export async function sendSubscriptionReminder(
  to: string,
  fullName: string,
  expiresAt: Date
): Promise<boolean> {
  const trans = getTransporter();
  if (!trans) return false;
  const dateStr = expiresAt.toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const pricingUrl = `${config.frontendUrl}/pricing`;
  try {
    await trans.sendMail({
      from: config.smtp.from,
      to,
      subject: "AttanalPro – Obunangiz tez orada tugaydi",
      text: `Salom ${fullName}. Sizning AttanalPro obunangiz ${dateStr} da tugaydi. Davom etish uchun tariflar sahifasiga tashrif buyuring: ${pricingUrl}`,
      html: `
        <p>Salom ${fullName},</p>
        <p>Sizning AttanalPro obunangiz <strong>${dateStr}</strong> da tugaydi.</p>
        <p>Davom etish uchun <a href="${pricingUrl}">tariflar sahifasiga</a> tashrif buyuring.</p>
      `,
    });
    return true;
  } catch (err) {
    console.error("Email (subscription reminder) xatosi:", err);
    return false;
  }
}
