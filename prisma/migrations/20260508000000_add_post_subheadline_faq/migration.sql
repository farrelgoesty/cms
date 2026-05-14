-- AlterTable
ALTER TABLE `Post`
  ADD COLUMN `subheadline` VARCHAR(500) NULL AFTER `slug`,
  ADD COLUMN `faqItems` JSON NULL AFTER `excerpt`;
