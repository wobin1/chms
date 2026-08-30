-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VisitorStatus" AS ENUM ('NEW', 'FOLLOW_UP', 'CONTACTED', 'RETURNING', 'CONVERTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "VisitFollowUpStatus" AS ENUM ('NONE', 'PENDING', 'CONTACTED', 'CLOSED');

-- CreateTable
CREATE TABLE "service_types" (
    "id" UUID NOT NULL,
    "church_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_categories" (
    "id" UUID NOT NULL,
    "church_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "church_id" UUID NOT NULL,
    "service_type_id" UUID NOT NULL,
    "service_date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "theme" TEXT,
    "scripture" TEXT,
    "preacher" TEXT,
    "start_time" TEXT,
    "end_time" TEXT,
    "notes" TEXT,
    "status" "ServiceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_attendance" (
    "id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "attendance_category_id" UUID NOT NULL,
    "count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitors" (
    "id" UUID NOT NULL,
    "church_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "gender" "MemberGender" NOT NULL DEFAULT 'UNSPECIFIED',
    "address" TEXT,
    "how_heard" TEXT,
    "first_visit_date" DATE,
    "status" "VisitorStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "converted_member_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor_visits" (
    "id" UUID NOT NULL,
    "visitor_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "visit_date" DATE NOT NULL,
    "follow_up_status" "VisitFollowUpStatus" NOT NULL DEFAULT 'NONE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitor_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_types_church_id_idx" ON "service_types"("church_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_types_church_id_name_key" ON "service_types"("church_id", "name");

-- CreateIndex
CREATE INDEX "attendance_categories_church_id_idx" ON "attendance_categories"("church_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_categories_church_id_name_key" ON "attendance_categories"("church_id", "name");

-- CreateIndex
CREATE INDEX "services_church_id_idx" ON "services"("church_id");

-- CreateIndex
CREATE INDEX "services_service_date_idx" ON "services"("service_date");

-- CreateIndex
CREATE INDEX "service_attendance_service_id_idx" ON "service_attendance"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_attendance_service_id_attendance_category_id_key" ON "service_attendance"("service_id", "attendance_category_id");

ALTER TABLE "service_attendance" ADD CONSTRAINT "service_attendance_count_non_negative" CHECK ("count" >= 0);

-- CreateIndex
CREATE INDEX "visitors_church_id_idx" ON "visitors"("church_id");

-- CreateIndex
CREATE INDEX "visitors_last_name_idx" ON "visitors"("last_name");

-- CreateIndex
CREATE INDEX "visitor_visits_visitor_id_idx" ON "visitor_visits"("visitor_id");

-- CreateIndex
CREATE INDEX "visitor_visits_service_id_idx" ON "visitor_visits"("service_id");

-- AddForeignKey
ALTER TABLE "service_types" ADD CONSTRAINT "service_types_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_categories" ADD CONSTRAINT "attendance_categories_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_attendance" ADD CONSTRAINT "service_attendance_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_attendance" ADD CONSTRAINT "service_attendance_attendance_category_id_fkey" FOREIGN KEY ("attendance_category_id") REFERENCES "attendance_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_converted_member_id_fkey" FOREIGN KEY ("converted_member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_visits" ADD CONSTRAINT "visitor_visits_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_visits" ADD CONSTRAINT "visitor_visits_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
