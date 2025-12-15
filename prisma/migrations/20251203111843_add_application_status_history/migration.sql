-- AlterTable
ALTER TABLE `application` ADD COLUMN `academicQualification` VARCHAR(191) NULL,
    ADD COLUMN `additionalFee` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `additionalNotes` VARCHAR(191) NULL,
    ADD COLUMN `additionalServices` JSON NULL,
    ADD COLUMN `applicationFee` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `country` VARCHAR(191) NULL,
    ADD COLUMN `dateOfBirth` DATETIME(3) NULL,
    ADD COLUMN `identityNumber` VARCHAR(191) NULL,
    ADD COLUMN `paymentDetails` JSON NULL,
    ADD COLUMN `paymentMethod` VARCHAR(191) NULL,
    ADD COLUMN `paymentStatus` VARCHAR(191) NULL,
    ADD COLUMN `personalAddress` VARCHAR(191) NULL,
    ADD COLUMN `totalFee` DECIMAL(65, 30) NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `program` ADD COLUMN `about` VARCHAR(191) NULL,
    ADD COLUMN `classSchedule` VARCHAR(191) NULL,
    ADD COLUMN `coreSubjects` JSON NULL,
    ADD COLUMN `department` VARCHAR(191) NULL,
    ADD COLUMN `lastApplicationDate` VARCHAR(191) NULL,
    ADD COLUMN `programImages` JSON NULL,
    ADD COLUMN `studyYear` INTEGER NULL;

-- CreateTable
CREATE TABLE `ApplicationDocument` (
    `id` VARCHAR(191) NOT NULL,
    `applicationId` VARCHAR(191) NOT NULL,
    `documentType` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NULL,
    `mimeType` VARCHAR(191) NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ApplicationDocument_applicationId_idx`(`applicationId`),
    INDEX `ApplicationDocument_documentType_idx`(`documentType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `applicationId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `paymentMethod` VARCHAR(191) NOT NULL,
    `paymentStatus` VARCHAR(191) NOT NULL,
    `paymentDetails` JSON NULL,
    `transactionId` VARCHAR(191) NULL,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Payment_applicationId_key`(`applicationId`),
    INDEX `Payment_paymentStatus_idx`(`paymentStatus`),
    INDEX `Payment_transactionId_idx`(`transactionId`),
    INDEX `Payment_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApplicationStatusHistory` (
    `id` VARCHAR(191) NOT NULL,
    `applicationId` VARCHAR(191) NOT NULL,
    `previousStatus` ENUM('PENDING', 'REVIEW', 'APPROVED', 'REJECTED') NULL,
    `newStatus` ENUM('PENDING', 'REVIEW', 'APPROVED', 'REJECTED') NOT NULL,
    `changedBy` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ApplicationStatusHistory_applicationId_idx`(`applicationId`),
    INDEX `ApplicationStatusHistory_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Application_email_idx` ON `Application`(`email`);

-- CreateIndex
CREATE INDEX `Program_degree_idx` ON `Program`(`degree`);

-- CreateIndex
CREATE INDEX `Program_department_idx` ON `Program`(`department`);

-- CreateIndex
CREATE INDEX `Program_isActive_idx` ON `Program`(`isActive`);

-- AddForeignKey
ALTER TABLE `ApplicationDocument` ADD CONSTRAINT `ApplicationDocument_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `Application`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `Application`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApplicationStatusHistory` ADD CONSTRAINT `ApplicationStatusHistory_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `Application`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
