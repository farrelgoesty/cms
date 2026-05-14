-- Add configurable label for YouTube section on posts
ALTER TABLE `Post`
  ADD COLUMN `youtubeLabel` VARCHAR(160) NULL AFTER `youtubeUrl`;
