/**
 * "Sarf asoslari" bo'limi uchun TypeScript tiplari.
 * Manba: backend/prisma/sarf-content/DESIGN.md — (B) API kontrakti va (C) kontent JSON shakli.
 */

// ── Kontent bloklari (theory) ───────────────────────────────

export type SarfBlockType = "heading" | "paragraph" | "example" | "note" | "tableRef";

export interface SarfBlock {
  type: SarfBlockType;
  /** heading | paragraph | note uchun (o'zbekcha) */
  text?: string;
  /** example uchun — to'liq harakatlangan arabcha */
  arabic?: string;
  /** example uchun — lotin transliteratsiya */
  translit?: string;
  /** example uchun — o'zbekcha ma'no */
  meaning?: string;
  /** tableRef uchun — conjugationTables[].id ga ishora */
  tableId?: string;
}

// ── Tuslanish jadvallari ────────────────────────────────────

export interface SarfConjRow {
  /** uzunligi columns.length bilan teng */
  cells: string[];
  /** ixtiyoriy: qatorda ajratib ko'rsatiladigan qo'shimcha/prefiks */
  highlight?: string;
}

export interface SarfConjTable {
  /** lesson ichida unique (tableRef shu id'ni ko'rsatadi) */
  id: string;
  title: string;
  /** masalan "ن ص ر" */
  rootArabic: string;
  columns: string[];
  rows: SarfConjRow[];
}

// ── Savollar (MCQ) ──────────────────────────────────────────

export interface SarfQuestion {
  id: string;
  orderIndex: number;
  prompt: string;
  /** aynan 4 ta */
  options: string[];
  /** 0..3 */
  correctIndex: number;
  explanation: string;
}

// ── Progress ────────────────────────────────────────────────

export type SarfProgressStatus = "not_started" | "in_progress" | "completed";

export interface SarfProgress {
  status: SarfProgressStatus;
  /** to'g'ri javoblar soni (savollar sonidan) */
  bestScore: number;
  completedAt: string | null;
}

// ── API javob shakllari ─────────────────────────────────────

/** GET /api/sarf/lessons ro'yxat elementi (theory/conjugationTables qaytarilmaydi) */
export interface SarfLessonListItem {
  id: string;
  slug: string;
  order: number;
  level: string;
  titleUz: string;
  titleAr: string;
  summary: string;
  estMinutes: number;
  isFree: boolean;
  questionCount: number;
  hasAccess: boolean;
  progress: SarfProgress;
}

export interface SarfLessonsResponse {
  lessons: SarfLessonListItem[];
}

/** GET /api/sarf/lessons/:slug — to'liq dars (parse qilingan) */
export interface SarfLessonDetail {
  id: string;
  slug: string;
  order: number;
  level: string;
  titleUz: string;
  titleAr: string;
  summary: string;
  estMinutes: number;
  isFree: boolean;
  theory: SarfBlock[];
  conjugationTables: SarfConjTable[];
  questions: SarfQuestion[];
  progress: SarfProgress;
}

export interface SarfLessonDetailResponse {
  lesson: SarfLessonDetail;
}

/** POST /api/sarf/lessons/:slug/complete javobi */
export interface SarfCompleteResponse {
  score: number;
  total: number;
  bestScore: number;
}
