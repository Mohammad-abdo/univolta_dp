-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `invoiceFileName` VARCHAR(191) NULL,
    ADD COLUMN `invoiceUrl` VARCHAR(191) NULL;
