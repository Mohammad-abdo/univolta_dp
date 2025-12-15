-- AlterTable
ALTER TABLE `payment` ADD COLUMN `invoiceFileName` VARCHAR(191) NULL,
    ADD COLUMN `invoiceUrl` VARCHAR(191) NULL;
