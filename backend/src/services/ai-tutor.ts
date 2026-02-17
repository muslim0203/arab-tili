import { aiGenerate, isAiAvailable } from "../lib/ai-client.js";

export async function chatWithTutor(
  userMessage: string,
  languagePreference: string,
  cefrLevel?: string | null
): Promise<{ response: string; tokensUsed?: number }> {
  if (!isAiAvailable()) throw new Error("AI sozlanmagan (GEMINI_API_KEY yoki OPENAI_API_KEY kerak)");

  const level = cefrLevel ? `Foydalanuvchi taxminiy darajasi: ${cefrLevel}. ` : "";
  const lang = languagePreference === "ar" ? "arabcha" : languagePreference === "ru" ? "ruscha" : "o'zbekcha";
  const systemPrompt = `Siz arab tili (fus'ha) bo'yicha CEFR asosida yordam beradigan tutor siz. ${level}Foydalanuvchi savoliga javobni asosan ${lang} tilida bering. Qisqa, aniq va foydali bo'ling. Arab tili grammatikasi, so'z boyligi va imtihon tayyorgarligida yordam bering.`;

  const result = await aiGenerate({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    maxTokens: 800,
  });

  return { response: result.text || "AI javob berishi mumkin emas edi." };
}
