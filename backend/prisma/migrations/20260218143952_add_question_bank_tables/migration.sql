-- CreateTable
CREATE TABLE "grammar_questions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "option_a" TEXT NOT NULL,
    "option_b" TEXT NOT NULL,
    "option_c" TEXT NOT NULL,
    "option_d" TEXT NOT NULL,
    "correct_index" INTEGER NOT NULL,
    "tags" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "reading_passages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" TEXT NOT NULL,
    "passage_type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "reading_time_seconds" INTEGER NOT NULL,
    "question_time_seconds" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "reading_questions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "passage_id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "option_a" TEXT NOT NULL,
    "option_b" TEXT NOT NULL,
    "option_c" TEXT NOT NULL,
    "option_d" TEXT NOT NULL,
    "correct_index" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reading_questions_passage_id_fkey" FOREIGN KEY ("passage_id") REFERENCES "reading_passages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "listening_stages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" TEXT NOT NULL,
    "stage_type" TEXT NOT NULL,
    "title_arabic" TEXT NOT NULL,
    "audio_url" TEXT NOT NULL,
    "max_plays" INTEGER NOT NULL DEFAULT 2,
    "time_mode" TEXT NOT NULL,
    "per_question_seconds" INTEGER,
    "total_seconds" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "listening_questions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stage_id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "option_a" TEXT NOT NULL,
    "option_b" TEXT NOT NULL,
    "option_c" TEXT NOT NULL,
    "option_d" TEXT NOT NULL,
    "correct_index" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "listening_questions_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "listening_stages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "writing_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "word_limit_min" INTEGER NOT NULL,
    "word_limit_max" INTEGER NOT NULL,
    "rubric" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "speaking_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" TEXT NOT NULL,
    "part1_questions" TEXT NOT NULL,
    "part2_topics" TEXT NOT NULL,
    "part3_discussion" TEXT NOT NULL,
    "rubric" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "grammar_questions_level_idx" ON "grammar_questions"("level");

-- CreateIndex
CREATE INDEX "reading_passages_level_idx" ON "reading_passages"("level");

-- CreateIndex
CREATE INDEX "reading_questions_passage_id_idx" ON "reading_questions"("passage_id");

-- CreateIndex
CREATE INDEX "listening_stages_level_idx" ON "listening_stages"("level");

-- CreateIndex
CREATE INDEX "listening_questions_stage_id_idx" ON "listening_questions"("stage_id");

-- CreateIndex
CREATE INDEX "writing_tasks_level_idx" ON "writing_tasks"("level");

-- CreateIndex
CREATE INDEX "speaking_tasks_level_idx" ON "speaking_tasks"("level");
