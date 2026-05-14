import type { Request, Response } from "express";
import { PostStatus } from "@prisma/client";
import { postService } from "../../services/post.service";
import { postSchema } from "../../validations/post.validation";
import { buildPagination } from "../../utils/pagination";
import { buildCanonicalUrl } from "../../utils/meta";
import { buildYoutubePreview } from "../../utils/youtube";
import { getYoutubeDefaultLabel } from "../../utils/media";
import { appendNotice } from "../../utils/flash";
import { categoryService } from "../../services/category.service";
import { tagService } from "../../services/tag.service";

function pageQuery(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function routeParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";
}

function buildPageUrl(page: number, status: string, q = "") {
  const params = new URLSearchParams();
  if (status && status !== "ALL") {
    params.set("status", status);
  }
  if (q) {
    params.set("q", q);
  }
  if (page > 1) {
    params.set("page", String(page));
  }

  const search = params.toString();
  return search ? `/admin/posts?${search}` : "/admin/posts";
}

function parseTaxonomyNames(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => (typeof item === "string" ? item.split(",") : []))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export const postController = {
  async index(req: Request, res: Response) {
    const page = pageQuery(req.query.page);
    const status = (req.query.status as PostStatus | "ALL" | undefined) ?? "ALL";
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const { items, total } = await postService.listAdmin(page, 10, status, q);
    const pagination = buildPagination(page, total, 10);

    res.render("admin/posts/index", {
      layout: "layouts/admin",
      title: "Posts",
      posts: items,
      total,
      page,
      status,
      q,
      pagination: {
        ...pagination,
        prevUrl: buildPageUrl(pagination.page - 1, status, q),
        nextUrl: buildPageUrl(pagination.page + 1, status, q),
        pages: pagination.pages.map((item) => ({
          ...item,
          url: buildPageUrl(item.number, status, q)
        }))
      }
    });
  },

  async createForm(_req: Request, res: Response) {
    const data = await postService.getCreateFormData();
    res.render("admin/posts/create", {
      layout: "layouts/admin",
      title: "Create Post",
      ...data,
      youtubePreview: null,
      defaultYoutubeLabel: getYoutubeDefaultLabel()
    });
  },

  async store(req: Request, res: Response) {
    const parsed = postSchema.safeParse(req.body);
    if (!parsed.success) {
      const data = await postService.getCreateFormData();
      return res.status(422).render("admin/posts/create", {
        layout: "layouts/admin",
        title: "Create Post",
        notice: "Periksa kembali form post sebelum menyimpan.",
        noticeType: "warning",
        ...data,
        youtubePreview: buildYoutubePreview(typeof req.body.youtubeUrl === "string" ? req.body.youtubeUrl : ""),
        defaultYoutubeLabel: getYoutubeDefaultLabel(),
        errors: parsed.error.flatten().fieldErrors,
        values: req.body
      });
    }

    const authorId = req.authUser?.id;
    if (!authorId) {
      return res.redirect("/admin/login");
    }

    await postService.create({
      title: parsed.data.title,
      ...(parsed.data.slug ? { slug: parsed.data.slug } : {}),
      ...(parsed.data.subheadline ? { subheadline: parsed.data.subheadline } : {}),
      ...(parsed.data.excerpt ? { excerpt: parsed.data.excerpt } : {}),
      ...(parsed.data.youtubeUrl ? { youtubeUrl: parsed.data.youtubeUrl } : {}),
      ...(parsed.data.youtubeLabel ? { youtubeLabel: parsed.data.youtubeLabel } : {}),
      youtubePosition: parsed.data.youtubePosition,
      content: parsed.data.content,
      ...(parsed.data.featuredImage ? { featuredImage: parsed.data.featuredImage } : {}),
      ...(parsed.data.seoTitle ? { seoTitle: parsed.data.seoTitle } : {}),
      ...(parsed.data.seoDescription ? { seoDescription: parsed.data.seoDescription } : {}),
      status: parsed.data.status,
      ...(parsed.data.categoryNames ? { categoryNames: parsed.data.categoryNames } : {}),
      categoryIds: parsed.data.categoryIds,
      tagIds: parsed.data.tagIds,
      ...(parsed.data.tagNames ? { tagNames: parsed.data.tagNames } : {}),
      faqItems: parsed.data.faqItems,
      authorId
    });

    return res.redirect(appendNotice("/admin/posts", "Post berhasil dibuat.", "success"));
  },

  async createTaxonomy(req: Request, res: Response) {
    const kind = typeof req.body.kind === "string" ? req.body.kind.trim() : "";
    const names = parseTaxonomyNames(req.body.names);

    if (!req.authUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!["category", "tag"].includes(kind)) {
      return res.status(422).json({ error: "Jenis taxonomy tidak valid." });
    }

    if (!names.length) {
      return res.status(422).json({ error: "Nama tidak boleh kosong." });
    }

    const uniqueNames = Array.from(new Set(names));
    const items = [];

    for (const name of uniqueNames) {
      const item = kind === "category"
        ? await categoryService.createOrUpdateByName(name)
        : await tagService.createOrUpdateByName(name);
      items.push(item);
    }

    return res.json({
      kind,
      items
    });
  },

  async editForm(req: Request, res: Response) {
    const data = await postService.getEditFormData(routeParam(req.params.id));
    if (!data.post) {
      return res.status(404).render("errors/404", { layout: "layouts/blog", title: "Not found" });
    }

    res.render("admin/posts/edit", {
      layout: "layouts/admin",
      title: "Edit Post",
      ...data,
      youtubePreview: buildYoutubePreview(data.post?.youtubeUrl ?? null),
      defaultYoutubeLabel: getYoutubeDefaultLabel()
    });
  },

  async update(req: Request, res: Response) {
    const parsed = postSchema.safeParse(req.body);
    if (!parsed.success) {
      const data = await postService.getEditFormData(routeParam(req.params.id));
      return res.status(422).render("admin/posts/edit", {
        layout: "layouts/admin",
        title: "Edit Post",
        notice: "Periksa kembali form post sebelum menyimpan.",
        noticeType: "warning",
        ...data,
        youtubePreview: buildYoutubePreview(typeof req.body.youtubeUrl === "string" ? req.body.youtubeUrl : data.post?.youtubeUrl ?? ""),
        defaultYoutubeLabel: getYoutubeDefaultLabel(),
        errors: parsed.error.flatten().fieldErrors,
        values: req.body
      });
    }

    await postService.update(routeParam(req.params.id), {
      title: parsed.data.title,
      ...(parsed.data.slug ? { slug: parsed.data.slug } : {}),
      ...(parsed.data.subheadline ? { subheadline: parsed.data.subheadline } : {}),
      ...(parsed.data.excerpt ? { excerpt: parsed.data.excerpt } : {}),
      ...(parsed.data.youtubeUrl ? { youtubeUrl: parsed.data.youtubeUrl } : {}),
      ...(parsed.data.youtubeLabel ? { youtubeLabel: parsed.data.youtubeLabel } : {}),
      youtubePosition: parsed.data.youtubePosition,
      content: parsed.data.content,
      ...(parsed.data.featuredImage ? { featuredImage: parsed.data.featuredImage } : {}),
      ...(parsed.data.seoTitle ? { seoTitle: parsed.data.seoTitle } : {}),
      ...(parsed.data.seoDescription ? { seoDescription: parsed.data.seoDescription } : {}),
      status: parsed.data.status,
      ...(parsed.data.categoryNames ? { categoryNames: parsed.data.categoryNames } : {}),
      categoryIds: parsed.data.categoryIds,
      tagIds: parsed.data.tagIds,
      ...(parsed.data.tagNames ? { tagNames: parsed.data.tagNames } : {}),
      faqItems: parsed.data.faqItems
    });
    return res.redirect(appendNotice("/admin/posts", "Post berhasil diperbarui.", "success"));
  },

  async preview(req: Request, res: Response) {
    const post = await postService.getEditFormData(routeParam(req.params.id));
    if (!post.post) {
      return res.status(404).render("errors/404", { layout: "layouts/blog", title: "Not found" });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const featuredImageUrl = post.post.featuredImage
      ? /^https?:\/\//i.test(post.post.featuredImage)
        ? post.post.featuredImage
        : buildCanonicalUrl(baseUrl, post.post.featuredImage)
      : undefined;

    res.render("blog/post", {
      layout: "layouts/blog",
      title: post.post.seoTitle ?? post.post.title,
      meta: {
        title: post.post.seoTitle ?? post.post.title,
        description: post.post.seoDescription ?? post.post.excerpt ?? post.post.subheadline ?? post.post.title,
        canonical: `${baseUrl}/admin/posts/${post.post.id}/preview`,
        image: featuredImageUrl,
        type: "article",
        robots: "noindex,follow"
      },
      post: post.post,
      related: [],
      commentTree: [],
      replyTo: "",
      replyTarget: null,
      faqItems: Array.isArray(post.post.faqItems) ? post.post.faqItems : [],
      publishedAt: post.post.publishedAt ?? post.post.createdAt,
      commentStatus: "",
      featuredImageUrl,
      youtubePreview: buildYoutubePreview(post.post.youtubeUrl),
      isPreview: true,
      defaultYoutubeLabel: getYoutubeDefaultLabel()
    });
  },

  async publish(req: Request, res: Response) {
    await postService.setStatus(routeParam(req.params.id), "PUBLISHED");
    return res.redirect(appendNotice("/admin/posts", "Post berhasil dipublish.", "success"));
  },

  async draft(req: Request, res: Response) {
    await postService.setStatus(routeParam(req.params.id), "DRAFT");
    return res.redirect(appendNotice("/admin/posts", "Post berhasil dijadikan draft.", "success"));
  },

  async destroy(req: Request, res: Response) {
    await postService.delete(routeParam(req.params.id));
    res.redirect(appendNotice("/admin/posts", "Post berhasil dihapus.", "success"));
  }
};
