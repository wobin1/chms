-- AlterTable
ALTER TABLE "churches" ADD COLUMN "family_of_the_week_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "churches_family_of_the_week_id_key" ON "churches"("family_of_the_week_id");

-- AddForeignKey
ALTER TABLE "churches" ADD CONSTRAINT "churches_family_of_the_week_id_fkey" FOREIGN KEY ("family_of_the_week_id") REFERENCES "families"("id") ON DELETE SET NULL ON UPDATE CASCADE;
