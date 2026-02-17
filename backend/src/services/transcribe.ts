import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { config } from "../config.js";

const openai = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;

/** Transcribe audio file (webm, mp3, wav, etc.) to text via Whisper. Returns transcript or empty string on error. */
export async function transcribeAudio(filePath: string): Promise<string> {
  if (!openai) return "";
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) return "";
  const stream = fs.createReadStream(resolved);
  try {
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
