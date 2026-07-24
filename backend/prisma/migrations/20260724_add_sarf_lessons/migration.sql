-- CreateTable: sarf_lessons
CREATE TABLE "sarf_lessons" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "level" TEXT NOT NULL,
    "title_uz" TEXT NOT NULL,
    "title_ar" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "est_minutes" INTEGER NOT NULL,
    "is_free" BOOLEAN NOT NULL DEFAULT false,
    "theory" TEXT NOT NULL,
    "conjugation_tables" TEXT NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sarf_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable: sarf_questions
CREATE TABLE "sarf_questions" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "prompt" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "correct_index" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sarf_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: sarf_lesson_progress
CREATE TABLE "sarf_lesson_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "best_score" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sarf_lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sarf_lessons_slug_key" ON "sarf_lessons"("slug");

-- CreateIndex
CREATE INDEX "sarf_lessons_order_idx" ON "sarf_lessons"("order");

-- CreateIndex
CREATE INDEX "sarf_questions_lesson_id_idx" ON "sarf_questions"("lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "sarf_lesson_progress_user_id_lesson_id_key" ON "sarf_lesson_progress"("user_id", "lesson_id");

-- AddForeignKey
ALTER TABLE "sarf_questions" ADD CONSTRAINT "sarf_questions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "sarf_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sarf_lesson_progress" ADD CONSTRAINT "sarf_lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sarf_lesson_progress" ADD CONSTRAINT "sarf_lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "sarf_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
