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
    audioUrl: string;
    maxPlays: 2;
    timeMode: ListeningTimeMode;
    /** Per-question time in seconds (stage 1 only) */
    perQuestionTimeSec?: number;
    /** Total time for all questions in seconds (stages 2 & 3) */
    totalTimeSec?: number;
    questions: ListeningQuestion[];
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
        writing: null;   // future
        speaking: null;  // future
    };
    totalScore: number; // partial sum
    maxPossibleScore: number; // 150 at full, 90 for now
    level: string | null; // CEFR level
}

/** Level thresholds (based on total score out of 150) */
export type CEFRLevel = "A2" | "B1" | "B2" | "C1" | "C2" | "Below A2";

/** State machine for the exam flow */
export type ExamPhase =
    | "cards"       // exam selection screen
    | "grammar"     // grammar section running
    | "reading"     // reading section running
    | "listening"   // listening section running
    | "results";    // showing results

/** Reading sub-phase within a passage */
export type PassagePhase = "reading" | "questions";
