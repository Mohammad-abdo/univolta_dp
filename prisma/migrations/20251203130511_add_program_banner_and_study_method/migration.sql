-- AlterTable
ALTER TABLE `program` ADD COLUMN `bannerImage` VARCHAR(191) NULL,
    ADD COLUMN `startDate` VARCHAR(191) NULL,
    ADD COLUMN `studyMethod` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `universityId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `User_universityId_idx` ON `User`(`universityId`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_universityId_fkey` FOREIGN KEY (`universityId`) REFERENCES `University`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
