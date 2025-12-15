-- AlterTable
ALTER TABLE `application` ADD COLUMN `blockedAt` DATETIME(3) NULL,
    ADD COLUMN `blockedReason` VARCHAR(191) NULL,
    ADD COLUMN `isBlocked` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `Application_isBlocked_idx` ON `Application`(`isBlocked`);
