// ─────────────────────────────────────────────────
// At-Taanal Exam – Type Definitions
// ─────────────────────────────────────────────────

/** A single grammar MC question */
export interface GrammarQuestion {
    id: string;
    prompt: string; // Arabic prompt
    options: [string, string, string, string];
    correctIndex: 0 | 1 | 2 | 3;
}

/** A single reading MC question */
export interface ReadingQuestion {
    id: string;
    prompt: string;
    options: [string, string, string, string];
    correctIndex: 0 | 1 | 2 | 3;
}

/** A reading passage with its sub-questions */
export interface ReadingPassage {
    id: string;
    text: string; // Arabic passage
    readingTimeSec: number; // seconds for reading phase
    questionTimeSec: number; // seconds for question phase (total)
    questions: ReadingQuestion[];
}

/** A single listening MC question */
export interface ListeningQuestion {
    id: string;
    prompt: string; // Arabic prompt
    options: [string, string, string, string];
    correctIndex: 0 | 1 | 2 | 3;
    /** Per-question audio URL (from DB) */
    audioUrl?: string;
    /** Max plays for this question */
    maxPlays?: number;
}

/** Listening stage type */
export type ListeningStageType = "short_dialogue" | "long_conversation" | "lecture";

/** Listening stage time mode */
export type ListeningTimeMode = "per_question" | "total";

/** A listening stage (one of 3 stages) */
export interface ListeningStage {
    stageIndex: 1 | 2 | 3;
    type: ListeningStageType;
    /** Arabic title */
    title: string;
    /** Stage-level audio URL (optional — per-question audio takes priority) */
    audioUrl?: string;
    maxPlays: number;
    timeMode: ListeningTimeMode;
    /** Per-question time in seconds (stage 1 only) */
    perQuestionTimeSec?: number;
    /** Total time for all questions in seconds (stages 2 & 3) */
    totalTimeSec?: number;
    questions: ListeningQuestion[];
}

// ─── Writing ──────────────────────────────────────

export type WritingDifficulty = "easy" | "hard";

export interface WritingTask {
    id: string;
    difficulty: WritingDifficulty;
    prompt: string; // Arabic text
    wordLimitMin: number;  // 80
    wordLimitMax: number;  // 130
    maxScore: 15;
}

export type WritingAnswerStatus = "pending" | "processing" | "scored";

export interface WritingRubric {
    content: number;          // 0-3 Content relevance
    organization: number;     // 0-3 Organization & coherence
    grammar: number;          // 0-3 Grammar accuracy
    vocabulary: number;       // 0-3 Vocabulary range
    taskAchievement: number;  // 0-3 Task achievement
}

export interface WritingAnswer {
    taskId: string;
    text: string;
    wordCount: number;
    score: number | null;           // 0-15
    feedback?: string | null;
    rubric?: WritingRubric | null;
    status: WritingAnswerStatus;
}

// ─── Speaking ─────────────────────────────────────

export type SpeakingDifficulty = "easy" | "medium" | "hard";

export interface SpeakingQuestion {
    id: string;
    difficulty: SpeakingDifficulty;
    prompt: string; // Arabic text
    maxScore: 5;
}

export type SpeakingAnswerStatus = "pending" | "recording" | "recorded" | "processing" | "scored";

export interface SpeakingRubric {
    fluency: number;      // 0-1
    grammar: number;      // 0-1
    vocabulary: number;   // 0-1
    pronunciation: number;// 0-1
    coherence: number;    // 0-1
}

export interface SpeakingAnswer {
    questionId: string;
    audioBlob?: Blob | null;
    audioUrl?: string | null;
    transcript?: string | null;
    score: number | null;         // 0-5
    feedback?: string | null;
    rubric?: SpeakingRubric | null;
    status: SpeakingAnswerStatus;
}

/** An answer record for a single question */
export interface Answer {
    questionId: string;
    selectedIndex: number | null;
    isCorrect: boolean | null;
}

/** A passage attempt with answers */
export interface PassageAttempt {
    passageId: string;
    answers: Answer[];
    score: number;
}

/** A listening stage attempt result */
export interface ListeningStageAttempt {
    stageIndex: number;
    answers: Answer[];
    score: number;
}

/** Section-level score data */
export interface GrammarSectionResult {
    answers: Answer[];
    score: number;
    maxScore: 30;
}

export interface ReadingSectionResult {
    passages: PassageAttempt[];
    score: number; // scaled to 30
    rawCorrect: number; // out of 24
    maxScore: 30;
}

export interface ListeningSectionResult {
    stages: ListeningStageAttempt[];
    score: number; // scaled to 30
    rawCorrect: number; // out of 15
    maxScore: 30;
}

export interface WritingSectionResult {
    answers: WritingAnswer[];
    score: number;
    maxScore: number;
}

export interface SpeakingSectionResult {
    answers: SpeakingAnswer[];
    score: number;
    maxScore: number;
}

/** The full exam attempt */
export interface ExamAttempt {
    id: string;
    examType: "at-taanal";
    startedAt: string; // ISO
    completedAt?: string;
    status: "in_progress" | "completed";
    sections: {
        grammar: GrammarSectionResult | null;
        reading: ReadingSectionResult | null;
        listening: ListeningSectionResult | null;
        writing: WritingSectionResult | null;
        speaking: SpeakingSectionResult | null;
    };
    totalScore: number; // partial sum
    maxPossibleScore: number; // 150 full (grammar 30 + reading 30 + listening 30 + writing 30 + speaking 30)
    level: string | null; // CEFR level
}

/** Level thresholds (based on total score out of 150) */
export type CEFRLevel = "A2" | "B1" | "B2" | "C1" | "C2" | "Below A2";

/** State machine for the exam flow */
export type ExamPhase =
    | "cards"              // exam selection screen
    | "grammar"            // grammar section running
    | "reading"            // reading section running
    | "listening"          // listening section running
    | "writing"            // writing section running
    | "speaking"           // speaking section running
    | "speaking-writing"   // standalone S+W exam
    | "results";           // showing results

/** Reading sub-phase within a passage */
export type PassagePhase = "reading" | "questions";
