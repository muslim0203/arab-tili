-- CreateTable
CREATE TABLE "question_bank" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "task_type" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" TEXT,
    "correct_answer" TEXT NOT NULL,
    "transcript" TEXT,
    "passage" TEXT,
    "audio_url" TEXT,
    "rubric" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 3,
    "tags" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "subscription_tier" TEXT NOT NULL DEFAULT 'FREE',
    "subscription_expires_at" DATETIME,
    "language_preference" TEXT NOT NULL DEFAULT 'uz',
    "last_login" DATETIME,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "exam_types" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "exam_sections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exam_type_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "exam_sections_exam_type_id_fkey" FOREIGN KEY ("exam_type_id") REFERENCES "exam_types" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exam_section_id" TEXT NOT NULL,
    "question_type" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "options" TEXT,
    "correct_answer" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "questions_exam_section_id_fkey" FOREIGN KEY ("exam_section_id") REFERENCES "exam_sections" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mock_exams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exam_type_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration_minutes" INTEGER NOT NULL,
    "use_ai_generation" BOOLEAN NOT NULL DEFAULT false,
    "number_of_questions" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "mock_exams_exam_type_id_fkey" FOREIGN KEY ("exam_type_id") REFERENCES "exam_types" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mock_exam_questions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mock_exam_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "mock_exam_questions_mock_exam_id_fkey" FOREIGN KEY ("mock_exam_id") REFERENCES "mock_exams" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "mock_exam_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_exam_attempts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "mock_exam_id" TEXT,
    "level" TEXT,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "total_score" INTEGER,
    "max_possible_score" INTEGER,
    "percentage" REAL,
    "cefr_level_achieved" TEXT,
    "cefr_feedback" TEXT,
    "section_scores" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_exam_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_exam_attempts_mock_exam_id_fkey" FOREIGN KEY ("mock_exam_id") REFERENCES "mock_exams" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "attempt_questions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attempt_id" TEXT NOT NULL,
    "source_question_id" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "section" TEXT NOT NULL DEFAULT 'reading',
    "task_type" TEXT NOT NULL DEFAULT 'mcq',
    "question_type" TEXT NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "question_text" TEXT NOT NULL,
    "transcript" TEXT,
    "passage" TEXT,
    "options" TEXT,
    "correct_answer" TEXT,
    "rubric" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "max_score" INTEGER,
    "word_limit" INTEGER,
    "audio_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attempt_questions_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "user_exam_attempts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "attempt_questions_source_question_id_fkey" FOREIGN KEY ("source_question_id") REFERENCES "question_bank" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_answers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attempt_id" TEXT NOT NULL,
    "question_id" TEXT,
    "attempt_question_id" TEXT,
    "answer_text" TEXT,
    "audio_url" TEXT,
    "is_correct" BOOLEAN,
    "points_earned" INTEGER,
    "score" REAL,
    "ai_feedback" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "user_exam_attempts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_answers_attempt_question_id_fkey" FOREIGN KEY ("attempt_question_id") REFERENCES "attempt_questions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "total_exams_taken" INTEGER NOT NULL DEFAULT 0,
    "skill_scores" TEXT,
    "current_streak_days" INTEGER NOT NULL DEFAULT 0,
    "current_cefr_estimate" TEXT,
    "last_activity_at" DATETIME,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_tutor_conversations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "question_asked" TEXT NOT NULL,
    "ai_response" TEXT NOT NULL,
    "tokens_used" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_tutor_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "plan_id" TEXT,
    "payment_provider_id" TEXT,
    "paid_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "question_bank_level_section_idx" ON "question_bank"("level", "section");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "mock_exam_questions_mock_exam_id_question_id_key" ON "mock_exam_questions"("mock_exam_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_answers_attempt_id_attempt_question_id_key" ON "user_answers"("attempt_id", "attempt_question_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_answers_attempt_id_question_id_key" ON "user_answers"("attempt_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_progress_user_id_key" ON "user_progress"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_provider_id_key" ON "payments"("payment_provider_id");
