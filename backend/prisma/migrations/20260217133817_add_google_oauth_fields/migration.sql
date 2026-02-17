-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL DEFAULT '',
    "full_name" TEXT NOT NULL,
    "google_id" TEXT,
    "avatar_url" TEXT,
    "subscription_tier" TEXT NOT NULL DEFAULT 'FREE',
    "subscription_expires_at" DATETIME,
    "language_preference" TEXT NOT NULL DEFAULT 'uz',
    "last_login" DATETIME,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_users" ("created_at", "email", "full_name", "id", "is_admin", "language_preference", "last_login", "password_hash", "subscription_expires_at", "subscription_tier", "updated_at") SELECT "created_at", "email", "full_name", "id", "is_admin", "language_preference", "last_login", "password_hash", "subscription_expires_at", "subscription_tier", "updated_at" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
