-- CreateEnum
CREATE TYPE "ZoneStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ZoneLeaderStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MemberGender" AS ENUM ('FEMALE', 'MALE', 'OTHER', 'UNSPECIFIED');

-- CreateTable
CREATE TABLE "zones" (
    "id" UUID NOT NULL,
    "church_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ZoneStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zone_leaders" (
    "id" UUID NOT NULL,
    "zone_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Zone Leader',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ZoneLeaderStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "zone_leaders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_statuses" (
    "id" UUID NOT NULL,
    "church_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" UUID NOT NULL,
    "church_id" UUID NOT NULL,
    "zone_id" UUID,
    "membership_status_id" UUID NOT NULL,
    "membership_number" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "last_name" TEXT NOT NULL,
    "gender" "MemberGender" NOT NULL DEFAULT 'UNSPECIFIED',
    "date_of_birth" DATE,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "occupation" TEXT,
    "marital_status" TEXT,
    "date_joined" DATE,
    "photo_url" TEXT,
    "photo_public_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "zones_church_id_idx" ON "zones"("church_id");

-- CreateIndex
CREATE UNIQUE INDEX "zones_church_id_name_key" ON "zones"("church_id", "name");

-- CreateIndex
CREATE INDEX "zone_leaders_user_id_idx" ON "zone_leaders"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "zone_leaders_zone_id_user_id_key" ON "zone_leaders"("zone_id", "user_id");

-- CreateIndex
CREATE INDEX "membership_statuses_church_id_idx" ON "membership_statuses"("church_id");

-- CreateIndex
CREATE UNIQUE INDEX "membership_statuses_church_id_name_key" ON "membership_statuses"("church_id", "name");

-- CreateIndex
CREATE INDEX "members_church_id_idx" ON "members"("church_id");

-- CreateIndex
CREATE INDEX "members_zone_id_idx" ON "members"("zone_id");

-- CreateIndex
CREATE INDEX "members_membership_status_id_idx" ON "members"("membership_status_id");

-- CreateIndex
CREATE INDEX "members_last_name_idx" ON "members"("last_name");

-- CreateIndex
CREATE UNIQUE INDEX "members_church_id_membership_number_key" ON "members"("church_id", "membership_number");

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_leaders" ADD CONSTRAINT "zone_leaders_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_leaders" ADD CONSTRAINT "zone_leaders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_statuses" ADD CONSTRAINT "membership_statuses_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_membership_status_id_fkey" FOREIGN KEY ("membership_status_id") REFERENCES "membership_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
