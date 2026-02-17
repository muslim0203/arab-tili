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

    // 1) Gemini bilan urinish
    const model = getGeminiModel();
    if (model) {
        try {
            return await callGemini(model, messages, maxTokens, jsonMode, temperature);
        } catch (e) {
            console.warn("[AI] Gemini xato, OpenAI ga o'tish:", (e as Error).message);
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
    // System prompt va chat history ajratish
    const systemInstruction = messages
        .filter((m) => m.role === "system")
        .map((m) => m.content)
        .join("\n\n");

    const history = messages
        .filter((m) => m.role !== "system")
        .slice(0, -1) // Oxirgi xabarni qoldirish
        .map((m) => ({
            role: m.role === "assistant" ? "model" as const : "user" as const,
            parts: [{ text: m.content }],
        }));

    const lastMessage = messages.filter((m) => m.role !== "system").slice(-1)[0];
    const userPrompt = lastMessage?.content ?? "";

    // JSON mode uchun ko'rsatma qo'shish
    const fullSystemPrompt = jsonMode
        ? `${systemInstruction}\n\nIMPORTANT: Faqat valid JSON formatida javob qaytaring. Boshqa matn yozmang.`
        : systemInstruction;

    const chat = model.startChat({
        history,
        systemInstruction: fullSystemPrompt || undefined,
        generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: temperature ?? (jsonMode ? 0.3 : 0.7),
            responseMimeType: jsonMode ? "application/json" : "text/plain",
        },
    });

    const result = await chat.sendMessage(userPrompt);
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
