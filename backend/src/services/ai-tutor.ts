import OpenAI from "openai";
import { config } from "../config.js";

const openai = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;

export async function chatWithTutor(
  userMessage: string,
  languagePreference: string,
  cefrLevel?: string | null
): Promise<{ response: string; tokensUsed?: number }> {
  if (!openai) throw new Error("OPENAI_API_KEY sozlanmagan");

  const level = cefrLevel ? `Foydalanuvchi taxminiy darajasi: ${cefrLevel}. ` : "";
  const lang = languagePreference === "ar" ? "arabcha" : languagePreference === "ru" ? "ruscha" : "o'zbekcha";
  const systemPrompt = `Siz arab tili (fus'ha) bo'yicha CEFR asosida yordam beradigan tutor siz. ${level}Foydalanuvchi savoliga javobni asosan ${lang} tilida bering. Qisqa, aniq va foydali bo'ling. Arab tili grammatikasi, so'z boyligi va imtihon tayyorgarligida yordam bering.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    max_tokens: 800,
  });

  const content = completion.choices[0]?.message?.content?.trim() ?? "";
  const tokensUsed = completion.usage?.total_tokens;
  return { response: content, tokensUsed: tokensUsed ?? undefined };
}
