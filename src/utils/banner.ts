import { normalizeLinkUrl } from "./media";

export type BannerPositionValue = "TOP" | "RIGHT";

export type BannerItem = {
  image: string;
  position: BannerPositionValue;
  url?: string;
};

function isBannerPosition(value: unknown): value is BannerPositionValue {
  return value === "TOP" || value === "RIGHT";
}

function normalizePosition(value: unknown): BannerPositionValue {
  if (value === "LEFT") {
    return "RIGHT";
  }

  return isBannerPosition(value) ? value : "TOP";
}

function normalizeUrl(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = normalizeLinkUrl(value);
  return normalized || undefined;
}

function toBannerItem(value: unknown): BannerItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const image = typeof (value as { image?: unknown }).image === "string" ? (value as { image: string }).image.trim() : "";
  if (!image) {
    return null;
  }

  const url = normalizeUrl((value as { url?: unknown }).url);
  const position = normalizePosition((value as { position?: unknown }).position);

  return {
    image,
    position,
    ...(url ? { url } : {})
  };
}

export function normalizeBannerItems(value: unknown): BannerItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(toBannerItem).filter((item): item is BannerItem => Boolean(item));
}

export function legacyBannerToItems(input: {
  bannerImage?: string | null | undefined;
  bannerUrl?: string | null | undefined;
  bannerPosition?: unknown;
}): BannerItem[] {
  const image = typeof input.bannerImage === "string" ? input.bannerImage.trim() : "";
  if (!image) {
    return [];
  }

  const url = normalizeUrl(input.bannerUrl);

  return [
    {
      image,
      position: normalizePosition(input.bannerPosition),
      ...(url ? { url } : {})
    }
  ];
}

export function resolveBannerItems(value: unknown, legacy: {
  bannerImage?: string | null | undefined;
  bannerUrl?: string | null | undefined;
  bannerPosition?: unknown;
}): BannerItem[] {
  const items = normalizeBannerItems(value);
  return items.length ? items : legacyBannerToItems(legacy);
}
