import OpenAI from "openai";
import { z } from "zod";
import { config } from "../config.js";

const openai = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

// ---- Writing ----

export const WritingTaskSchema = z.object({
  taskId: z.string(),
  prompt: z.string(),
  wordLimit: z.number(),
  rubric: z.record(z.union([z.string(), z.number()])).or(z.string()),
  maxScore: z.number().default(10),
});
export type WritingTask = z.infer<typeof WritingTaskSchema>;

export const WritingTasksResponseSchema = z.object({
  tasks: z.array(WritingTaskSchema),
});
export type WritingTasksResponse = z.infer<typeof WritingTasksResponseSchema>;

export const WritingGradeSchema = z.object({
  score: z.number(),
  maxScore: z.number(),
  feedback: z.string(),
  rubricBreakdown: z.record(z.number()).optional(),
});
export type WritingGrade = z.infer<typeof WritingGradeSchema>;

const WRITING_SYSTEM = `You are a CEFR Arabic (fus'ha) writing assessor. Return only valid JSON.
For generateWritingTasks: { "tasks": [ { "taskId": "w1", "prompt": "...", "wordLimit": 150, "rubric": { "content": 4, "grammar": 3, "vocabulary": 3 }, "maxScore": 10 } ] }.
For gradeWriting: { "score": number, "maxScore": number, "feedback": "string", "rubricBreakdown": { "content": 2, "grammar": 1.5 } } (optional).`;

export async function generateWritingTasks(level: CefrLevel, count: number = 2): Promise<WritingTasksResponse> {
  if (!openai) throw new Error("OPENAI_API_KEY not set");
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: WRITING_SYSTEM },
      {
        role: "user",
        content: `Generate ${count} CEFR ${level} Arabic (fus'ha) writing tasks. Topics: education, society, technology, culture, economy. Return JSON: { "tasks": [ { "taskId": "w1", "prompt": "...", "wordLimit": 150, "rubric": { "content": 4, "grammar": 3, "vocabulary": 3 }, "maxScore": 10 }, ... ] }.`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1500,
  });
  const raw = JSON.parse(completion.choices[0]?.message?.content?.trim() || "{}");
  return WritingTasksResponseSchema.parse(raw);
}

export async function gradeWriting(
  level: CefrLevel,
  task: { prompt: string; rubric: unknown; maxScore: number },
  userText: string
): Promise<WritingGrade> {
  if (!openai) {
    return {
      score: 0,
      maxScore: task.maxScore,
      feedback: "OPENAI_API_KEY not set; grading skipped.",
    };
  }
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: WRITING_SYSTEM },
      {
        role: "user",
        content: `CEFR ${level}. Task: ${task.prompt}. Rubric: ${JSON.stringify(task.rubric)}. User text:\n${userText}\n\nReturn JSON: { "score": number, "maxScore": ${task.maxScore}, "feedback": "string", "rubricBreakdown": {} }.`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 600,
  });
  const raw = JSON.parse(completion.choices[0]?.message?.content?.trim() || "{}");
  return WritingGradeSchema.parse({ ...raw, maxScore: task.maxScore });
}

// ---- Speaking ----

export const SpeakingTaskSchema = z.object({
  taskId: z.string(),
  part: z.enum(["intro", "monologue", "discussion"]),
  prompt: z.string(),
  rubric: z.record(z.union([z.string(), z.number()])).or(z.string()),
  maxScore: z.number().default(10),
});
export type SpeakingTask = z.infer<typeof SpeakingTaskSchema>;

export const SpeakingExamResponseSchema = z.object({
  script: z.object({
    intro: z.array(z.string()).optional(),
    monologueTopics: z.array(z.string()).optional(),
    discussionQuestions: z.array(z.string()).optional(),
  }),
  tasks: z.array(SpeakingTaskSchema),
  rubric: z.record(z.union([z.string(), z.number()])).or(z.string()),
});
export type SpeakingExamResponse = z.infer<typeof SpeakingExamResponseSchema>;

export const SpeakingGradeSchema = z.object({
  score: z.number(),
  maxScore: z.number(),
  feedback: z.string(),
  rubricBreakdown: z.record(z.number()).optional(),
});
export type SpeakingGrade = z.infer<typeof SpeakingGradeSchema>;

const SPEAKING_SYSTEM = `You are a CEFR Arabic (fus'ha) speaking assessor. Return only valid JSON.
For generateSpeakingTasks: { "script": { "intro": ["Q1","Q2"], "monologueTopics": ["..."], "discussionQuestions": ["..."] }, "tasks": [ { "taskId": "s1", "part": "intro", "prompt": "...", "rubric": {}, "maxScore": 10 } ], "rubric": {} }.
For gradeSpeaking: { "score": number, "maxScore": number, "feedback": "string", "rubricBreakdown": {} }.`;

export async function generateSpeakingTasks(level: CefrLevel): Promise<SpeakingExamResponse> {
  if (!openai) throw new Error("OPENAI_API_KEY not set");
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SPEAKING_SYSTEM },
      {
        role: "user",
        content: `Generate CEFR ${level} Arabic (fus'ha) 3-part speaking exam: intro questions, monologue topics, discussion questions. Include tasks array with taskId, part, prompt, rubric, maxScore. Return JSON.`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 2000,
  });
  const raw = JSON.parse(completion.choices[0]?.message?.content?.trim() || "{}");
  return SpeakingExamResponseSchema.parse(raw);
}

export async function gradeSpeaking(
  level: CefrLevel,
  task: { prompt: string; rubric: unknown; maxScore: number },
  userTextOrTranscript: string
): Promise<SpeakingGrade> {
  if (!openai) {
    return {
      score: 0,
      maxScore: task.maxScore,
      feedback: "OPENAI_API_KEY not set; grading skipped.",
    };
  }
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SPEAKING_SYSTEM },
      {
        role: "user",
        content: `CEFR ${level}. Task: ${task.prompt}. Rubric: ${JSON.stringify(task.rubric)}. User response (transcript):\n${userTextOrTranscript}\n\nReturn JSON: { "score": number, "maxScore": ${task.maxScore}, "feedback": "string", "rubricBreakdown": {} }.`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 600,
  });
  const raw = JSON.parse(completion.choices[0]?.message?.content?.trim() || "{}");
  return SpeakingGradeSchema.parse({ ...raw, maxScore: task.maxScore });
}
