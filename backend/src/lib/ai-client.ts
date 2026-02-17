/**
 * Markaziy AI client – Gemini (asosiy) yoki OpenAI (zaxira).
 *
 * Gemini API key mavjud bo'lsa Gemini ishlatiladi,
 * aks holda OpenAI ishlatiladi.
 */
import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { config } from "../config.js";

// ========== Gemini ==========
const gemini = config.geminiApiKey
    ? new GoogleGenerativeAI(config.geminiApiKey)
    : null;

function getGeminiModel(model: string = "gemini-2.0-flash"): GenerativeModel | null {
    return gemini?.getGenerativeModel({ model }) ?? null;
}

// ========== OpenAI (zaxira) ==========
let openaiModule: typeof import("openai") | null = null;
let openaiClient: InstanceType<typeof import("openai").default> | null = null;

async function getOpenAI() {
    if (openaiClient) return openaiClient;
    if (!config.openaiApiKey) return null;
    if (!openaiModule) {
        openaiModule = await import("openai");
    }
    openaiClient = new openaiModule.default({ apiKey: config.openaiApiKey });
    return openaiClient;
}

// ========== Birlashtirilgan interfeys ==========
export type AiChatMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};

export type AiResponse = {
    text: string;
    provider: "gemini" | "openai" | "none";
};

/**
 * AI ga matn chiqarish so'rovi.
 * JSON javob kutilsa, jsonMode = true qilish kerak.
 */
export async function aiGenerate(opts: {
    messages: AiChatMessage[];
    maxTokens?: number;
    jsonMode?: boolean;
    temperature?: number;
}): Promise<AiResponse> {
    const { messages, maxTokens = 4000, jsonMode = false, temperature } = opts;

    // 1) Gemini bilan urinish (retry bilan)
    const model = getGeminiModel();
    if (model) {
        const maxRetries = 3;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await callGemini(model, messages, maxTokens, jsonMode, temperature);
            } catch (e) {
                const msg = (e as Error).message ?? "";
                const is429 = msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("quota");
                if (is429 && attempt < maxRetries) {
                    const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
                    console.warn(`[AI] Gemini 429 rate limit, ${delay / 1000}s kutish... (${attempt + 1}/${maxRetries})`);
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
                console.warn("[AI] Gemini xato, OpenAI ga o'tish:", msg.slice(0, 200));
                break;
            }
        }
    }

    // 2) OpenAI fallback
    const openai = await getOpenAI();
    if (openai) {
        try {
            return await callOpenAI(openai, messages, maxTokens, jsonMode, temperature);
        } catch (e) {
            console.error("[AI] OpenAI ham xato:", (e as Error).message);
        }
    }

    return { text: "", provider: "none" };
}

// ========== Gemini implementation ==========
async function callGemini(
    model: GenerativeModel,
    messages: AiChatMessage[],
    maxTokens: number,
    jsonMode: boolean,
    temperature?: number
): Promise<AiResponse> {
    // System prompt ajratish
    const systemParts = messages
        .filter((m) => m.role === "system")
        .map((m) => m.content);

    let systemInstruction = systemParts.join("\n\n");
    if (jsonMode) {
        systemInstruction += "\n\nIMPORTANT: Faqat valid JSON formatida javob qaytaring. Boshqa matn yozmang.";
    }

    // User va assistant xabarlarini contents ga aylantirish
    const nonSystemMessages = messages.filter((m) => m.role !== "system");
    const contents = nonSystemMessages.map((m) => ({
        role: m.role === "assistant" ? "model" as const : "user" as const,
        parts: [{ text: m.content }],
    }));

    // Agar contents bo'sh bo'lsa, systemInstruction ni user message sifatida qo'shish
    if (contents.length === 0) {
        contents.push({ role: "user" as const, parts: [{ text: systemInstruction }] });
        systemInstruction = "";
    }

    // Model ni system instruction bilan qayta yaratish
    const modelWithSystem = gemini!.getGenerativeModel({
        model: "gemini-2.0-flash",
        ...(systemInstruction ? { systemInstruction } : {}),
        generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: temperature ?? (jsonMode ? 0.3 : 0.7),
            responseMimeType: jsonMode ? "application/json" : "text/plain",
        },
    });

    const result = await modelWithSystem.generateContent({ contents });
    const text = result.response.text().trim();

    return { text, provider: "gemini" };
}

// ========== OpenAI implementation ==========
async function callOpenAI(
    openai: InstanceType<typeof import("openai").default>,
    messages: AiChatMessage[],
    maxTokens: number,
    jsonMode: boolean,
    temperature?: number
): Promise<AiResponse> {
    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: maxTokens,
        temperature: temperature ?? (jsonMode ? 0.3 : 0.7),
        ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    return { text, provider: "openai" };
}

/** AI mavjudligini tekshirish */
export function isAiAvailable(): boolean {
    return !!(config.geminiApiKey || config.openaiApiKey);
}

/** Qisqa helper: JSON javob olish */
export async function aiGenerateJson<T = Record<string, unknown>>(opts: {
    messages: AiChatMessage[];
    maxTokens?: number;
    temperature?: number;
}): Promise<{ data: T | null; provider: string }> {
    const result = await aiGenerate({ ...opts, jsonMode: true });
    if (!result.text) return { data: null, provider: result.provider };
    try {
        const data = JSON.parse(result.text) as T;
        return { data, provider: result.provider };
    } catch {
        console.error("[AI] JSON parse xato:", result.text.slice(0, 200));
        return { data: null, provider: result.provider };
    }
}
