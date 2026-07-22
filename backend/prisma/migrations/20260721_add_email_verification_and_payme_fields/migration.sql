-- Yetishmayotgan migratsiya: schema.prisma da bor, lekin hech qaysi
-- migratsiyada yo'q ustunlar (drift). Ular ilgari faqat `prisma db push`
-- bilan qo'shilgan, shuning uchun migratsiya tarixiga tushmay qolgan.
--
-- Bularsiz `prisma migrate deploy` bilan qurilgan bazada email tasdiqlash
-- va Payme to'lovlari ishlamaydi.

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "cancel_reason" INTEGER,
ADD COLUMN     "payme_cancel_time" TIMESTAMP(3),
ADD COLUMN     "payme_create_time" TIMESTAMP(3),
ADD COLUMN     "payme_perform_time" TIMESTAMP(3),
ADD COLUMN     "payme_state" INTEGER,
ADD COLUMN     "payme_trans_id" TEXT,
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'click';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verified_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "payments_payme_trans_id_key" ON "payments"("payme_trans_id");

