-- AlterTable
ALTER TABLE "families" ADD COLUMN "zone_id" UUID;

UPDATE "families" AS f
SET "zone_id" = (
  SELECT z.id FROM "zones" z
  WHERE z.church_id = f.church_id
  ORDER BY z.name ASC
  LIMIT 1
)
WHERE f.zone_id IS NULL;

DELETE FROM "families" WHERE "zone_id" IS NULL;

ALTER TABLE "families" ALTER COLUMN "zone_id" SET NOT NULL;

CREATE INDEX "families_zone_id_idx" ON "families"("zone_id");

ALTER TABLE "families" ADD CONSTRAINT "families_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "zones" ADD COLUMN "family_of_the_week_id" UUID;

CREATE UNIQUE INDEX "zones_family_of_the_week_id_key" ON "zones"("family_of_the_week_id");

ALTER TABLE "zones" ADD CONSTRAINT "zones_family_of_the_week_id_fkey" FOREIGN KEY ("family_of_the_week_id") REFERENCES "families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "zones" AS z
SET "family_of_the_week_id" = c.family_of_the_week_id
FROM "churches" AS c
JOIN "families" AS f ON f.id = c.family_of_the_week_id
WHERE c.id = z.church_id
  AND f.zone_id = z.id
  AND c.family_of_the_week_id IS NOT NULL;

-- Drop church-level family of the week
ALTER TABLE "churches" DROP CONSTRAINT IF EXISTS "churches_family_of_the_week_id_fkey";
DROP INDEX IF EXISTS "churches_family_of_the_week_id_key";
ALTER TABLE "churches" DROP COLUMN IF EXISTS "family_of_the_week_id";
