import { PostStatus } from "@prisma/client";
import { postRepository } from "../repositories/post.repository";
import { categoryService } from "./category.service";
import { tagService } from "./tag.service";
import { makeSlug } from "../utils/slugify";
import { getReadingTime } from "../utils/reading-time";
import { sanitizePlainText, sanitizeRichText } from "../utils/sanitize";
import { prisma } from "../config/prisma";
import { normalizeYoutubeUrl } from "../utils/youtube";
import { getMediaTypeFilterOptions, getYoutubeLabelOptions, getYoutubeDefaultLabel } from "../utils/media";

function parseNames(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseFaqItems(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const question = typeof (item as { question?: unknown }).question === "string" ? (item as { question: string }).question.trim() : "";
        const answer = typeof (item as { answer?: unknown }).answer === "string" ? (item as { answer: string }).answer.trim() : "";

        if (!question || !answer) {
          return null;
        }

        return { question, answer };
      })
      .filter((item): item is { question: string; answer: string } => Boolean(item));
  }

  return [];
}

async function ensureUniqueSlug(baseSlug: string, excludeId?: string) {
  let slug = baseSlug;
  let counter = 2;

  while (
    await prisma.post.findFirst({
      where: {
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {})
      },
      select: { id: true }
    })
  ) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}

export const postService = {
  async listAdmin(page: number, limit: number, status?: PostStatus | "ALL", q?: string) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      postRepository.listAdmin({ skip, take: limit, ...(status ? { status } : {}), ...(q ? { q } : {}) }),
      postRepository.countAdmin(status, q)
    ]);

    return { items, total };
  },

  async getCreateFormData() {
    const [categories, tags, linkOptions] = await Promise.all([
      postRepository.listCategories(),
      tagService.list(),
      postRepository.listPublishedLinkOptions()
    ]);
    return {
      categories,
      tags,
      linkOptions,
      mediaTypes: getMediaTypeFilterOptions(),
      youtubeLabelOptions: getYoutubeLabelOptions(),
      defaultYoutubeLabel: getYoutubeDefaultLabel()
    };
  },

  async getEditFormData(id: string) {
    const [post, categories, tags, linkOptions] = await Promise.all([
      postRepository.findById(id),
      postRepository.listCategories(),
      tagService.list(),
      postRepository.listPublishedLinkOptions(id)
    ]);

    return {
      post,
      categories,
      tags,
      linkOptions,
      mediaTypes: getMediaTypeFilterOptions(),
      youtubeLabelOptions: getYoutubeLabelOptions(),
      defaultYoutubeLabel: getYoutubeDefaultLabel()
    };
  },

  async create(input: {
    title: string;
    slug?: string;
    subheadline?: string;
    excerpt?: string;
    youtubeUrl?: string;
    youtubeLabel?: string;
    youtubePosition: "TOP" | "MIDDLE" | "BOTTOM";
    faqItems: { question: string; answer: string }[];
    content: string;
    featuredImage?: string;
    seoTitle?: string;
    seoDescription?: string;
    status: PostStatus;
    authorId: string;
    categoryNames?: string;
    categoryIds: string[];
    tagIds: string[];
    tagNames?: string;
  }) {
    const categories = await categoryService.ensureNames(parseNames(input.categoryNames));
    const tags = await tagService.ensureNames(parseNames(input.tagNames));
    const categoryIds = Array.from(new Set([...input.categoryIds, ...categories.map((item) => item.id)]));
    const tagIds = Array.from(new Set([...input.tagIds, ...tags.map((item) => item.id)]));
    const slug = await ensureUniqueSlug(makeSlug(input.slug || input.title));
    const content = sanitizeRichText(input.content);
    const excerpt = input.excerpt ? sanitizeRichText(input.excerpt) : undefined;
    const postData = {
      title: input.title,
      slug,
      content,
      faqItems: parseFaqItems(input.faqItems),
      ...(input.youtubeUrl !== undefined ? { youtubeUrl: normalizeYoutubeUrl(input.youtubeUrl) ?? null } : {}),
      ...(input.youtubeLabel ? { youtubeLabel: sanitizePlainText(input.youtubeLabel) } : {}),
      youtubePosition: input.youtubePosition,
      status: input.status,
      publishedAt: input.status === PostStatus.PUBLISHED ? new Date() : null,
      readingTime: getReadingTime(content),
      author: { connect: { id: input.authorId } },
      ...(input.subheadline ? { subheadline: sanitizePlainText(input.subheadline) } : {}),
      ...(excerpt ? { excerpt } : {}),
      ...(input.featuredImage ? { featuredImage: input.featuredImage } : {}),
      ...(input.seoTitle ? { seoTitle: input.seoTitle } : {}),
      ...(input.seoDescription ? { seoDescription: input.seoDescription } : {})
    };

    return postRepository.create(
      postData,
      categoryIds,
      tagIds
    );
  },

  async update(
    id: string,
    input: {
      title: string;
      slug?: string;
      subheadline?: string;
      excerpt?: string;
      youtubeUrl?: string;
      youtubeLabel?: string;
      youtubePosition: "TOP" | "MIDDLE" | "BOTTOM";
      faqItems: { question: string; answer: string }[];
      content: string;
      featuredImage?: string;
      seoTitle?: string;
      seoDescription?: string;
      status: PostStatus;
      categoryNames?: string;
      categoryIds: string[];
      tagIds: string[];
      tagNames?: string;
    }
  ) {
    const categories = await categoryService.ensureNames(parseNames(input.categoryNames));
    const tags = await tagService.ensureNames(parseNames(input.tagNames));
    const categoryIds = Array.from(new Set([...input.categoryIds, ...categories.map((item) => item.id)]));
    const tagIds = Array.from(new Set([...input.tagIds, ...tags.map((item) => item.id)]));
    const existing = await postRepository.findById(id);
    if (!existing) {
      throw new Error("Post not found");
    }

    const slug = await ensureUniqueSlug(makeSlug(input.slug || input.title), id);
    const content = sanitizeRichText(input.content);
    const excerpt = input.excerpt ? sanitizeRichText(input.excerpt) : undefined;
    const postData = {
      title: input.title,
      slug,
      content,
      faqItems: parseFaqItems(input.faqItems),
      ...(input.youtubeUrl !== undefined ? { youtubeUrl: normalizeYoutubeUrl(input.youtubeUrl) ?? null } : {}),
      ...(input.youtubeLabel ? { youtubeLabel: sanitizePlainText(input.youtubeLabel) } : {}),
      youtubePosition: input.youtubePosition,
      status: input.status,
      publishedAt: input.status === PostStatus.PUBLISHED && !existing.publishedAt ? new Date() : existing.publishedAt,
      readingTime: getReadingTime(content),
      ...(input.subheadline ? { subheadline: sanitizePlainText(input.subheadline) } : {}),
      ...(excerpt ? { excerpt } : {}),
      ...(input.featuredImage ? { featuredImage: input.featuredImage } : {}),
      ...(input.seoTitle ? { seoTitle: input.seoTitle } : {}),
      ...(input.seoDescription ? { seoDescription: input.seoDescription } : {})
    };

    await postRepository.update(
      id,
      postData,
      categoryIds,
      tagIds
    );
  },

  async setStatus(id: string, status: PostStatus) {
    const existing = await postRepository.findById(id);
    if (!existing) {
      throw new Error("Post not found");
    }

    return prisma.post.update({
      where: { id },
      data: {
        status,
        publishedAt:
          status === PostStatus.PUBLISHED
            ? existing.publishedAt ?? new Date()
            : existing.publishedAt
      }
    });
  },

  delete(id: string) {
    return postRepository.delete(id);
  }
};
