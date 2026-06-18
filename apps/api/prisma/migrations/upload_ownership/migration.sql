-- F7 fix: Persist upload ownership in the database.
-- Replaces the in-process CacheService Map that reset on every restart,
-- causing the IDOR ownership check in UploadController.deleteFile() to
-- silently fail-open for any file uploaded before the last deploy.

CREATE TABLE "uploaded_files" (
  "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "filename"  VARCHAR(512) NOT NULL,
  "userId"    UUID         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "uploaded_files_pkey"        PRIMARY KEY ("id"),
  CONSTRAINT "uploaded_files_filename_key" UNIQUE ("filename"),
  CONSTRAINT "uploaded_files_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "users"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX "uploaded_files_userId_idx" ON "uploaded_files"("userId");
