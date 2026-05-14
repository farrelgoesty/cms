import type { Request, Response } from "express";
import { postRepository } from "../repositories/post.repository";
import { categoryRepository } from "../repositories/category.repository";
import { tagRepository } from "../repositories/tag.repository";
import { commentService } from "../services/comment.service";
import { buildPagination, getPagination } from "../utils/pagination";
import { buildCanonicalUrl } from "../utils/meta";
import { commentSchema } from "../validations/comment.validation";
import { buildYoutubePreview } from "../utils/youtube";
import { getYoutubeDefaultLabel } from "../utils/media";

type CommentRow = {
  id: string;
  parentId: string | null;
  name: string;
  email: string | null;
  content: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type CommentNode = CommentRow & {
  children: CommentNode[];
};

function pageQuery(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function buildPageUrl(pathname: string, page: number, query: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  if (page > 1) {
    params.set("page", String(page));
  }

  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

function routeParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";
}

function buildCommentTree(comments: CommentRow[]) {
  const byId = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  comments.forEach((comment) => {
    byId.set(comment.id, { ...comment, children: [] });
  });

  byId.forEach((comment) => {
    if (comment.parentId && byId.has(comment.parentId)) {
      byId.get(comment.parentId)!.children.push(comment);
    } else {
      roots.push(comment);
    }
  });

  const sortTree = (items: CommentNode[]) => {
    items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    items.forEach((item) => sortTree(item.children));
    return items;
  };

  return sortTree(roots);
}

function parseFaqItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

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

export const blogController = {
  async home(req: Request, res: Response) {
    const page = pageQuery(req.query.page);
    const { skip, limit } = getPagination(page, 10);
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const [posts, total, categories, tags] = await Promise.all([
      postRepository.listPublished({ skip, take: limit }),
      postRepository.countPublished(),
      categoryRepository.list(),
      tagRepository.list()
    ]);
    const pagination = buildPagination(page, total, limit);

    res.render("blog/home", {
      layout: "layouts/blog",
      title: "Home",
      meta: {
        title: "CMS Blog | Artikel SEO, Konten Editorial, dan Panduan Praktis",
        description:
          "CMS blog modern dengan artikel SEO, strategi konten, performance, dan desain admin yang rapi.",
        canonical: page > 1 ? buildCanonicalUrl(baseUrl, `/?page=${page}`) : buildCanonicalUrl(baseUrl, "/"),
        image: buildCanonicalUrl(baseUrl, "/uploads/2026/05/10dbd22d-5644-4174-ab95-d055485e73be.webp")
      },
      posts,
      categories,
      tags,
      page,
      total,
      pagination: {
        ...pagination,
        prevUrl: buildPageUrl("/", pagination.page - 1),
        nextUrl: buildPageUrl("/", pagination.page + 1),
        pages: pagination.pages.map((item) => ({
          ...item,
          url: buildPageUrl("/", item.number)
        }))
      }
    });
  },

  async showPost(req: Request, res: Response) {
    const post = await postRepository.findPublishedBySlug(routeParam(req.params.slug));
    if (!post) {
      return res.status(404).render("errors/404", { layout: "layouts/blog", title: "Not found" });
    }

    await postRepository.incrementViewCount(post.id);
    const related = await postRepository.related(
      post.id,
      post.postCategories.map((item) => item.categoryId),
      post.postTags.map((item) => item.tagId)
    );
    const replyTo = typeof req.query.replyTo === "string" ? req.query.replyTo : "";
    const commentStatus = typeof req.query.comment === "string" ? req.query.comment : "";
    const commentTree = buildCommentTree(post.comments);
    const replyTarget = replyTo
      ? post.comments.find((comment) => comment.id === replyTo) ?? null
      : null;
    const faqItems = parseFaqItems(post.faqItems);
    const publishedAt = post.publishedAt ?? post.createdAt;
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const featuredImageUrl = post.featuredImage
      ? /^https?:\/\//i.test(post.featuredImage)
        ? post.featuredImage
        : buildCanonicalUrl(baseUrl, post.featuredImage)
      : undefined;
    const shareImageUrl = featuredImageUrl || buildCanonicalUrl(baseUrl, "/uploads/2026/05/10dbd22d-5644-4174-ab95-d055485e73be.webp");
    const youtubePreview = buildYoutubePreview(post.youtubeUrl);
    const metaDescription = post.seoDescription ?? post.excerpt ?? post.subheadline ?? post.title;

    res.render("blog/post", {
      layout: "layouts/blog",
      title: post.seoTitle ?? post.title,
      meta: {
        title: post.seoTitle ?? post.title,
        description: metaDescription,
        canonical: buildCanonicalUrl(baseUrl, `/posts/${post.slug}`),
        image: shareImageUrl,
        type: "article"
      },
      post,
      related,
      commentTree,
      replyTo,
      replyTarget,
      faqItems,
      publishedAt,
      commentStatus,
      featuredImageUrl,
      youtubePreview,
      defaultYoutubeLabel: getYoutubeDefaultLabel()
    });
  },

  async category(req: Request, res: Response) {
    const category = await categoryRepository.findBySlug(routeParam(req.params.slug));
    if (!category) {
      return res.status(404).render("errors/404", { layout: "layouts/blog", title: "Not found" });
    }

    const page = pageQuery(req.query.page);
    const { skip, limit } = getPagination(page, 10);
    const [posts, total] = await Promise.all([
      postRepository.listPublished({
        skip,
        take: limit,
        categorySlug: category.slug
      }),
      postRepository.countPublished({
        status: "PUBLISHED",
        postCategories: { some: { category: { slug: category.slug } } }
      })
    ]);
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const pagination = buildPagination(page, total, limit);

    res.render("blog/archive", {
      layout: "layouts/blog",
      title: category.name,
      meta: {
        title: `${category.name} | CMS Blog`,
        description: `Kumpulan artikel ${category.name.toLowerCase()} yang tersusun rapi dan SEO friendly.`,
        canonical: buildCanonicalUrl(baseUrl, `/categories/${category.slug}${page > 1 ? `?page=${page}` : ""}`)
      },
      archiveTitle: category.name,
      posts,
      pagination: {
        ...pagination,
        prevUrl: buildPageUrl(`/categories/${category.slug}`, pagination.page - 1),
        nextUrl: buildPageUrl(`/categories/${category.slug}`, pagination.page + 1),
        pages: pagination.pages.map((item) => ({
          ...item,
          url: buildPageUrl(`/categories/${category.slug}`, item.number)
        }))
      }
    });
  },

  async tag(req: Request, res: Response) {
    const tag = await tagRepository.findBySlug(routeParam(req.params.slug));
    if (!tag) {
      return res.status(404).render("errors/404", { layout: "layouts/blog", title: "Not found" });
    }

    const page = pageQuery(req.query.page);
    const { skip, limit } = getPagination(page, 10);
    const [posts, total] = await Promise.all([
      postRepository.listPublished({
        skip,
        take: limit,
        tagSlug: tag.slug
      }),
      postRepository.countPublished({
        status: "PUBLISHED",
        postTags: { some: { tag: { slug: tag.slug } } }
      })
    ]);
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const pagination = buildPagination(page, total, limit);

    res.render("blog/archive", {
      layout: "layouts/blog",
      title: tag.name,
      meta: {
        title: `${tag.name} | CMS Blog`,
        description: `Artikel dengan tag ${tag.name.toLowerCase()} yang relevan dan mudah ditemukan lewat pencarian.`,
        canonical: buildCanonicalUrl(baseUrl, `/tags/${tag.slug}${page > 1 ? `?page=${page}` : ""}`)
      },
      archiveTitle: tag.name,
      posts,
      pagination: {
        ...pagination,
        prevUrl: buildPageUrl(`/tags/${tag.slug}`, pagination.page - 1),
        nextUrl: buildPageUrl(`/tags/${tag.slug}`, pagination.page + 1),
        pages: pagination.pages.map((item) => ({
          ...item,
          url: buildPageUrl(`/tags/${tag.slug}`, item.number)
        }))
      }
    });
  },

  async search(req: Request, res: Response) {
    const page = pageQuery(req.query.page);
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const { skip, limit } = getPagination(page, 10);
    const posts = q ? await postRepository.searchPublished(q, skip, limit) : [];
    const total = q ? await postRepository.countPublished({ OR: [{ title: { contains: q } }, { excerpt: { contains: q } }, { content: { contains: q } }] }) : 0;
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const pagination = buildPagination(page, total, limit);

    res.render("blog/search", {
      layout: "layouts/blog",
      title: q ? `Search: ${q}` : "Search",
      meta: {
        title: q ? `Search: ${q}` : "Search",
        description: "Cari artikel blog berdasarkan kata kunci, kategori, dan topik SEO.",
        canonical: q ? buildCanonicalUrl(baseUrl, `/search?q=${encodeURIComponent(q)}${page > 1 ? `&page=${page}` : ""}`) : buildCanonicalUrl(baseUrl, "/search"),
        robots: "noindex,follow",
        type: "article"
      },
      q,
      posts,
      total,
      page,
      pagination: {
        ...pagination,
        prevUrl: buildPageUrl("/search", pagination.page - 1, q ? { q } : {}),
        nextUrl: buildPageUrl("/search", pagination.page + 1, q ? { q } : {}),
        pages: pagination.pages.map((item) => ({
          ...item,
          url: buildPageUrl("/search", item.number, q ? { q } : {})
        }))
      }
    });
  },

  async createComment(req: Request, res: Response) {
    if (typeof req.body.website === "string" && req.body.website.trim().length > 0) {
      return res.redirect(req.get("referer") ?? "/");
    }

    const parsed = commentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.redirect(req.get("referer") ?? "/");
    }

    const post = await postRepository.findById(parsed.data.postId);
    if (!post || post.status !== "PUBLISHED") {
      return res.redirect("/");
    }

    await commentService.create({
      postId: parsed.data.postId,
      name: parsed.data.name,
      content: parsed.data.content,
      ...(parsed.data.parentId ? { parentId: parsed.data.parentId } : {}),
      ...(parsed.data.email ? { email: parsed.data.email } : {})
    });

    res.redirect(`/posts/${post.slug}?comment=submitted#comments`);
  }
};
