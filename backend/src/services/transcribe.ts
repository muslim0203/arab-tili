import fs from "fs";
import path from "path";

/**
 * Audio faylni transkript qilish.
 * 
 * Hozircha OpenAI Whisper yoki Gemini audio qo'llab-quvvatlanmaydi.
 * OpenAI API keyi mavjud bo'lsa Whisper ishlatiladi.
 * Aks holda bo'sh string qaytariladi.
 */
export async function transcribeAudio(filePath: string): Promise<string> {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) return "";

  // OpenAI Whisper bilan urinish
  const { config } = await import("../config.js");
  if (config.openaiApiKey) {
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

  // Gemini hozircha audio transcription qo'llamaydi
  // Kelajakda Gemini 2.0 Flash audio support qo'shilishi mumkin
  console.warn("[Transcribe] Audio transkriptsiya uchun OPENAI_API_KEY kerak (Whisper)");
  return "";
}
