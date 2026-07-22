import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";

/**
 * Audio faylni transkript qilish.
 *
 * OpenAI API keyi mavjud bo'lsa Whisper ishlatiladi, aks holda bo'sh string.
 *
 * Kirish sifatida ikkalasi ham qabul qilinadi:
 *  - lokal fayl yo'li      (eski yozuvlar: /app/uploads/... )
 *  - http(s) URL           (DO Spaces'dagi audiolar)
 *
 * URL berilsa fayl vaqtinchalik papkaga yuklab olinadi, transkripsiyadan keyin
 * o'chiriladi. Bu kerak, chunki Whisper SDK'ga fayl oqimi (stream) beriladi.
 */
export async function transcribeAudio(pathOrUrl: string): Promise<string> {
  if (!pathOrUrl) return "";

  const isRemote = /^https?:\/\//i.test(pathOrUrl);
  let localPath = "";
  let tempPath = "";

  if (isRemote) {
    tempPath = await downloadToTemp(pathOrUrl);
    if (!tempPath) return "";
    localPath = tempPath;
  } else {
    localPath = path.resolve(pathOrUrl);
    if (!fs.existsSync(localPath)) return "";
  }

  try {
    return await whisperTranscribe(localPath);
  } finally {
    if (tempPath) fs.unlink(tempPath, () => { });
  }
}

/** Uzoqdagi audioni vaqtinchalik faylga yuklab olish. Xato bo'lsa bo'sh string. */
async function downloadToTemp(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[Transcribe] Audio yuklab olinmadi: HTTP ${res.status}`);
      return "";
    }
    const buf = Buffer.from(await res.arrayBuffer());
    // Kengaytmani saqlaymiz — Whisper formatni shu bo'yicha aniqlaydi.
    const ext = path.extname(new URL(url).pathname) || ".webm";
    const dest = path.join(os.tmpdir(), `transcribe_${crypto.randomBytes(8).toString("hex")}${ext}`);
    await fs.promises.writeFile(dest, buf);
    return dest;
  } catch (e) {
    console.warn("[Transcribe] Audio yuklab olishda xato:", (e as Error).message);
    return "";
  }
}

async function whisperTranscribe(resolved: string): Promise<string> {
  const { config } = await import("../config.js");
  if (!config.openaiApiKey) {
    // Gemini hozircha audio transcription qo'llamaydi.
    console.warn("[Transcribe] Audio transkriptsiya uchun OPENAI_API_KEY kerak (Whisper)");
    return "";
  }
  try {
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey: config.openaiApiKey });
    const stream = fs.createReadStream(resolved);
    const transcription = await openai.audio.transcriptions.create({
      file: stream,
      model: "whisper-1",
      language: "ar",
    });
    return transcription.text?.trim() ?? "";
  } catch {
    return "";
  }
}
