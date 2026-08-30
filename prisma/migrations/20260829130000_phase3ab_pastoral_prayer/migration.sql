-- CreateEnum
CREATE TYPE "PastoralCaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'ON_HOLD', 'CLOSED');

-- CreateEnum
CREATE TYPE "PastoralCasePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "PrayerRequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'ANSWERED', 'CLOSED');

-- CreateTable
CREATE TABLE "pastoral_cases" (
    "id" UUID NOT NULL,
    "church_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "case_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "priority" "PastoralCasePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "PastoralCaseStatus" NOT NULL DEFAULT 'OPEN',
    "assigned_to" UUID,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pastoral_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prayer_requests" (
    "id" UUID NOT NULL,
    "church_id" UUID NOT NULL,
    "member_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "PrayerRequestStatus" NOT NULL DEFAULT 'OPEN',
    "assigned_to" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "prayer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pastoral_cases_church_id_idx" ON "pastoral_cases"("church_id");

-- CreateIndex
CREATE INDEX "pastoral_cases_member_id_idx" ON "pastoral_cases"("member_id");

-- CreateIndex
CREATE INDEX "pastoral_cases_status_idx" ON "pastoral_cases"("status");

-- CreateIndex
CREATE INDEX "prayer_requests_church_id_idx" ON "prayer_requests"("church_id");

-- CreateIndex
CREATE INDEX "prayer_requests_member_id_idx" ON "prayer_requests"("member_id");

-- CreateIndex
CREATE INDEX "prayer_requests_status_idx" ON "prayer_requests"("status");

-- AddForeignKey
ALTER TABLE "pastoral_cases" ADD CONSTRAINT "pastoral_cases_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastoral_cases" ADD CONSTRAINT "pastoral_cases_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastoral_cases" ADD CONSTRAINT "pastoral_cases_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prayer_requests" ADD CONSTRAINT "prayer_requests_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prayer_requests" ADD CONSTRAINT "prayer_requests_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prayer_requests" ADD CONSTRAINT "prayer_requests_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
