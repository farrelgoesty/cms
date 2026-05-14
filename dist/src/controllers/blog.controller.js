"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blogController = void 0;
const post_repository_1 = require("../repositories/post.repository");
const category_repository_1 = require("../repositories/category.repository");
const tag_repository_1 = require("../repositories/tag.repository");
const comment_service_1 = require("../services/comment.service");
const pagination_1 = require("../utils/pagination");
const meta_1 = require("../utils/meta");
const comment_validation_1 = require("../validations/comment.validation");
const youtube_1 = require("../utils/youtube");
const media_1 = require("../utils/media");
const banner_1 = require("../utils/banner");
function pageQuery(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
function buildPageUrl(pathname, page, query = {}) {
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
function routeParam(value) {
    return typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";
}
function buildCommentTree(comments) {
    const byId = new Map();
    const roots = [];
    comments.forEach((comment) => {
        byId.set(comment.id, { ...comment, children: [] });
    });
    byId.forEach((comment) => {
        if (comment.parentId && byId.has(comment.parentId)) {
            byId.get(comment.parentId).children.push(comment);
        }
        else {
            roots.push(comment);
        }
    });
    const sortTree = (items) => {
        items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        items.forEach((item) => sortTree(item.children));
        return items;
    };
    return sortTree(roots);
}
function parseFaqItems(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map((item) => {
        if (!item || typeof item !== "object") {
            return null;
        }
        const question = typeof item.question === "string" ? item.question.trim() : "";
        const answer = typeof item.answer === "string" ? item.answer.trim() : "";
        if (!question || !answer) {
            return null;
        }
        return { question, answer };
    })
        .filter((item) => Boolean(item));
}
exports.blogController = {
    async home(req, res) {
        const page = pageQuery(req.query.page);
        const { skip, limit } = (0, pagination_1.getPagination)(page, 10);
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const [posts, total, categories, tags] = await Promise.all([
            post_repository_1.postRepository.listPublished({ skip, take: limit }),
            post_repository_1.postRepository.countPublished(),
            category_repository_1.categoryRepository.list(),
            tag_repository_1.tagRepository.list()
        ]);
        const pagination = (0, pagination_1.buildPagination)(page, total, limit);
        res.render("blog/home", {
            layout: "layouts/blog",
            title: "Home",
            meta: {
                title: "CMS Blog | Artikel SEO, Konten Editorial, dan Panduan Praktis",
                description: "CMS blog modern dengan artikel SEO, strategi konten, performance, dan desain admin yang rapi.",
                canonical: page > 1 ? (0, meta_1.buildCanonicalUrl)(baseUrl, `/?page=${page}`) : (0, meta_1.buildCanonicalUrl)(baseUrl, "/"),
                image: (0, meta_1.buildCanonicalUrl)(baseUrl, "/uploads/2026/05/10dbd22d-5644-4174-ab95-d055485e73be.webp")
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
    async showPost(req, res) {
        const post = await post_repository_1.postRepository.findPublishedBySlug(routeParam(req.params.slug));
        if (!post) {
            return res.status(404).render("errors/404", { layout: "layouts/blog", title: "Not found" });
        }
        await post_repository_1.postRepository.incrementViewCount(post.id);
        const related = await post_repository_1.postRepository.related(post.id, post.postCategories.map((item) => item.categoryId), post.postTags.map((item) => item.tagId));
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
                : (0, meta_1.buildCanonicalUrl)(baseUrl, post.featuredImage)
            : undefined;
        const bannerItems = (0, banner_1.resolveBannerItems)(post.bannerItems, {
            bannerImage: post.bannerImage,
            bannerUrl: post.bannerUrl,
            bannerPosition: post.bannerPosition
        }).map((item) => ({
            ...item,
            imageUrl: /^https?:\/\//i.test(item.image) ? item.image : (0, meta_1.buildCanonicalUrl)(baseUrl, item.image)
        }));
        const bannerImageUrl = bannerItems[0]?.imageUrl
            ? bannerItems[0].imageUrl
            : undefined;
        const shareImageUrl = featuredImageUrl || bannerImageUrl || (0, meta_1.buildCanonicalUrl)(baseUrl, "/uploads/2026/05/10dbd22d-5644-4174-ab95-d055485e73be.webp");
        const youtubePreview = (0, youtube_1.buildYoutubePreview)(post.youtubeUrl);
        const metaDescription = post.seoDescription ?? post.excerpt ?? post.subheadline ?? post.title;
        res.render("blog/post", {
            layout: "layouts/blog",
            title: post.seoTitle ?? post.title,
            meta: {
                title: post.seoTitle ?? post.title,
                description: metaDescription,
                canonical: (0, meta_1.buildCanonicalUrl)(baseUrl, `/posts/${post.slug}`),
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
            bannerImageUrl,
            bannerItems,
            youtubePreview,
            defaultYoutubeLabel: (0, media_1.getYoutubeDefaultLabel)()
        });
    },
    async category(req, res) {
        const category = await category_repository_1.categoryRepository.findBySlug(routeParam(req.params.slug));
        if (!category) {
            return res.status(404).render("errors/404", { layout: "layouts/blog", title: "Not found" });
        }
        const page = pageQuery(req.query.page);
        const { skip, limit } = (0, pagination_1.getPagination)(page, 10);
        const [posts, total] = await Promise.all([
            post_repository_1.postRepository.listPublished({
                skip,
                take: limit,
                categorySlug: category.slug
            }),
            post_repository_1.postRepository.countPublished({
                status: "PUBLISHED",
                postCategories: { some: { category: { slug: category.slug } } }
            })
        ]);
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const pagination = (0, pagination_1.buildPagination)(page, total, limit);
        res.render("blog/archive", {
            layout: "layouts/blog",
            title: category.name,
            meta: {
                title: `${category.name} | CMS Blog`,
                description: `Kumpulan artikel ${category.name.toLowerCase()} yang tersusun rapi dan SEO friendly.`,
                canonical: (0, meta_1.buildCanonicalUrl)(baseUrl, `/categories/${category.slug}${page > 1 ? `?page=${page}` : ""}`)
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
    async tag(req, res) {
        const tag = await tag_repository_1.tagRepository.findBySlug(routeParam(req.params.slug));
        if (!tag) {
            return res.status(404).render("errors/404", { layout: "layouts/blog", title: "Not found" });
        }
        const page = pageQuery(req.query.page);
        const { skip, limit } = (0, pagination_1.getPagination)(page, 10);
        const [posts, total] = await Promise.all([
            post_repository_1.postRepository.listPublished({
                skip,
                take: limit,
                tagSlug: tag.slug
            }),
            post_repository_1.postRepository.countPublished({
                status: "PUBLISHED",
                postTags: { some: { tag: { slug: tag.slug } } }
            })
        ]);
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const pagination = (0, pagination_1.buildPagination)(page, total, limit);
        res.render("blog/archive", {
            layout: "layouts/blog",
            title: tag.name,
            meta: {
                title: `${tag.name} | CMS Blog`,
                description: `Artikel dengan tag ${tag.name.toLowerCase()} yang relevan dan mudah ditemukan lewat pencarian.`,
                canonical: (0, meta_1.buildCanonicalUrl)(baseUrl, `/tags/${tag.slug}${page > 1 ? `?page=${page}` : ""}`)
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
    async search(req, res) {
        const page = pageQuery(req.query.page);
        const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
        const { skip, limit } = (0, pagination_1.getPagination)(page, 10);
        const posts = q ? await post_repository_1.postRepository.searchPublished(q, skip, limit) : [];
        const total = q ? await post_repository_1.postRepository.countPublished({ OR: [{ title: { contains: q } }, { excerpt: { contains: q } }, { content: { contains: q } }] }) : 0;
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const pagination = (0, pagination_1.buildPagination)(page, total, limit);
        res.render("blog/search", {
            layout: "layouts/blog",
            title: q ? `Search: ${q}` : "Search",
            meta: {
                title: q ? `Search: ${q}` : "Search",
                description: "Cari artikel blog berdasarkan kata kunci, kategori, dan topik SEO.",
                canonical: q ? (0, meta_1.buildCanonicalUrl)(baseUrl, `/search?q=${encodeURIComponent(q)}${page > 1 ? `&page=${page}` : ""}`) : (0, meta_1.buildCanonicalUrl)(baseUrl, "/search"),
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
    async createComment(req, res) {
        if (typeof req.body.website === "string" && req.body.website.trim().length > 0) {
            return res.redirect(req.get("referer") ?? "/");
        }
        const parsed = comment_validation_1.commentSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.redirect(req.get("referer") ?? "/");
        }
        const post = await post_repository_1.postRepository.findById(parsed.data.postId);
        if (!post || post.status !== "PUBLISHED") {
            return res.redirect("/");
        }
        await comment_service_1.commentService.create({
            postId: parsed.data.postId,
            name: parsed.data.name,
            content: parsed.data.content,
            ...(parsed.data.parentId ? { parentId: parsed.data.parentId } : {}),
            ...(parsed.data.email ? { email: parsed.data.email } : {})
        });
        res.redirect(`/posts/${post.slug}?comment=submitted#comments`);
    }
};
