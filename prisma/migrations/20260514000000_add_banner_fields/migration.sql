ALTER TABLE `Post`
  ADD COLUMN `bannerImage` TEXT NULL AFTER `featuredImage`,
  ADD COLUMN `bannerUrl` TEXT NULL AFTER `bannerImage`,
  ADD COLUMN `bannerPosition` ENUM('TOP', 'LEFT', 'RIGHT') NOT NULL DEFAULT 'TOP' AFTER `bannerUrl`;
