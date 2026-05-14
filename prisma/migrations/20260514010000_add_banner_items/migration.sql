ALTER TABLE `Post`
  ADD COLUMN `bannerItems` JSON NULL AFTER `bannerPosition`;

UPDATE `Post`
SET `bannerItems` = JSON_ARRAY(
  JSON_OBJECT(
    'image', `bannerImage`,
    'url', `bannerUrl`,
    'position', `bannerPosition`
  )
)
WHERE `bannerItems` IS NULL
  AND `bannerImage` IS NOT NULL;

