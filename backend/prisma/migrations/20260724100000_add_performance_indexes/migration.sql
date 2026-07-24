-- Additive performance indexes (non-breaking, no data change).
-- Hot query paths: attempt history, payment lookups, AI-tutor history, attempt grading joins.

-- CreateIndex
CREATE INDEX "user_exam_attempts_user_id_created_at_idx" ON "user_exam_attempts"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "attempt_questions_attempt_id_idx" ON "attempt_questions"("attempt_id");

-- CreateIndex
CREATE INDEX "attempt_questions_source_question_id_idx" ON "attempt_questions"("source_question_id");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE INDEX "ai_tutor_conversations_user_id_created_at_idx" ON "ai_tutor_conversations"("user_id", "created_at");
