import { z } from "zod";
import { isValidYoutubeUrl } from "../utils/youtube";

const faqItemSchema = z.object({
  question: z.string().min(3).max(180),
  answer: z.string().min(10).max(1500)
});

const bannerItemSchema = z.object({
  image: z.string().trim().min(1).max(2048),
  url: z.string().trim().max(2048).optional().or(z.literal("")),
  position: z.enum(["TOP", "LEFT", "RIGHT"]).default("TOP")
});

function parseJsonValue(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

export const postSchema = z.object({
  title: z.string().trim().min(3).max(255),
  slug: z.string().trim().optional().or(z.literal("")),
  subheadline: z.string().trim().max(500).optional().or(z.literal("")),
  excerpt: z.string().trim().optional().or(z.literal("")),
  youtubeUrl: z.string().trim().optional().or(z.literal("")),
  youtubeLabel: z.string().trim().max(160).optional().or(z.literal("")),
  youtubePosition: z.enum(["TOP", "MIDDLE", "BOTTOM"]).default("TOP"),
  content: z.string().min(20),
  featuredImage: z.string().trim().optional().or(z.literal("")),
  bannerImage: z.string().trim().optional().or(z.literal("")),
  bannerUrl: z.string().trim().max(2048).optional().or(z.literal("")),
  bannerPosition: z.enum(["TOP", "LEFT", "RIGHT"]).default("TOP"),
  bannerItems: z.preprocess(parseJsonValue, z.array(bannerItemSchema).max(10)),
  seoTitle: z.string().trim().optional().or(z.literal("")),
  seoDescription: z.string().trim().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  categoryNames: z.string().trim().optional().or(z.literal("")),
  categoryIds: z.preprocess(
    (value) => {
      if (Array.isArray(value)) {
        return value.filter((item) => typeof item === "string" && item.length > 0);
      }

      if (typeof value === "string") {
        return value ? [value] : [];
      }

      return [];
    },
    z.array(z.string().uuid())
  ),
  tagIds: z.preprocess(
    (value) => {
      if (Array.isArray(value)) {
        return value.filter((item) => typeof item === "string" && item.length > 0);
      }

      if (typeof value === "string") {
        return value ? [value] : [];
      }

      return [];
    },
    z.array(z.string().uuid())
  ),
  tagNames: z.string().trim().optional().or(z.literal("")),
  faqItems: z.preprocess(parseJsonValue, z.array(faqItemSchema).max(8))
}).superRefine((data, ctx) => {
  if (data.youtubeUrl && !isValidYoutubeUrl(data.youtubeUrl)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["youtubeUrl"],
      message: "Masukkan URL YouTube yang valid."
    });
  }
});
