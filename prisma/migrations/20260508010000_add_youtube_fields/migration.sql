-- Add YouTube support to posts
ALTER TABLE `Post`
  ADD COLUMN `youtubeUrl` LONGTEXT NULL AFTER `faqItems`,
  ADD COLUMN `youtubePosition` ENUM('TOP', 'MIDDLE', 'BOTTOM') NOT NULL DEFAULT 'TOP' AFTER `youtubeUrl`;
