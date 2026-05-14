"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postController = void 0;
const post_service_1 = require("../../services/post.service");
const post_validation_1 = require("../../validations/post.validation");
const pagination_1 = require("../../utils/pagination");
const meta_1 = require("../../utils/meta");
const youtube_1 = require("../../utils/youtube");
const media_1 = require("../../utils/media");
const flash_1 = require("../../utils/flash");
const category_service_1 = require("../../services/category.service");
const tag_service_1 = require("../../services/tag.service");
const banner_1 = require("../../utils/banner");
function pageQuery(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
function routeParam(value) {
    return typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";
}
function buildPageUrl(page, status, q = "") {
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
function parseTaxonomyNames(value) {
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
exports.postController = {
    async index(req, res) {
        const page = pageQuery(req.query.page);
        const status = req.query.status ?? "ALL";
        const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
        const { items, total } = await post_service_1.postService.listAdmin(page, 10, status, q);
        const pagination = (0, pagination_1.buildPagination)(page, total, 10);
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
    async createForm(_req, res) {
        const data = await post_service_1.postService.getCreateFormData();
        res.render("admin/posts/create", {
            layout: "layouts/admin",
            title: "Create Post",
            ...data,
            youtubePreview: null,
            defaultYoutubeLabel: (0, media_1.getYoutubeDefaultLabel)()
        });
    },
    async store(req, res) {
        const parsed = post_validation_1.postSchema.safeParse(req.body);
        if (!parsed.success) {
            const data = await post_service_1.postService.getCreateFormData();
            return res.status(422).render("admin/posts/create", {
                layout: "layouts/admin",
                title: "Create Post",
                notice: "Periksa kembali form post sebelum menyimpan.",
                noticeType: "warning",
                ...data,
                youtubePreview: (0, youtube_1.buildYoutubePreview)(typeof req.body.youtubeUrl === "string" ? req.body.youtubeUrl : ""),
                defaultYoutubeLabel: (0, media_1.getYoutubeDefaultLabel)(),
                errors: parsed.error.flatten().fieldErrors,
                values: req.body
            });
        }
        const authorId = req.authUser?.id;
        if (!authorId) {
            return res.redirect("/admin/login");
        }
        await post_service_1.postService.create({
            title: parsed.data.title,
            ...(parsed.data.slug ? { slug: parsed.data.slug } : {}),
            ...(parsed.data.subheadline ? { subheadline: parsed.data.subheadline } : {}),
            ...(parsed.data.excerpt ? { excerpt: parsed.data.excerpt } : {}),
            ...(parsed.data.youtubeUrl ? { youtubeUrl: parsed.data.youtubeUrl } : {}),
            ...(parsed.data.youtubeLabel ? { youtubeLabel: parsed.data.youtubeLabel } : {}),
            youtubePosition: parsed.data.youtubePosition,
            content: parsed.data.content,
            ...(parsed.data.featuredImage ? { featuredImage: parsed.data.featuredImage } : {}),
            bannerItems: parsed.data.bannerItems,
            ...(parsed.data.bannerImage ? { bannerImage: parsed.data.bannerImage } : {}),
            ...(parsed.data.bannerUrl ? { bannerUrl: parsed.data.bannerUrl } : {}),
            bannerPosition: parsed.data.bannerPosition,
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
        return res.redirect((0, flash_1.appendNotice)("/admin/posts", "Post berhasil dibuat.", "success"));
    },
    async createTaxonomy(req, res) {
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
                ? await category_service_1.categoryService.createOrUpdateByName(name)
                : await tag_service_1.tagService.createOrUpdateByName(name);
            items.push(item);
        }
        return res.json({
            kind,
            items
        });
    },
    async editForm(req, res) {
        const data = await post_service_1.postService.getEditFormData(routeParam(req.params.id));
        if (!data.post) {
            return res.status(404).render("errors/404", { layout: "layouts/blog", title: "Not found" });
        }
        res.render("admin/posts/edit", {
            layout: "layouts/admin",
            title: "Edit Post",
            ...data,
            youtubePreview: (0, youtube_1.buildYoutubePreview)(data.post?.youtubeUrl ?? null),
            defaultYoutubeLabel: (0, media_1.getYoutubeDefaultLabel)()
        });
    },
    async update(req, res) {
        const parsed = post_validation_1.postSchema.safeParse(req.body);
        if (!parsed.success) {
            const data = await post_service_1.postService.getEditFormData(routeParam(req.params.id));
            return res.status(422).render("admin/posts/edit", {
                layout: "layouts/admin",
                title: "Edit Post",
                notice: "Periksa kembali form post sebelum menyimpan.",
                noticeType: "warning",
                ...data,
                youtubePreview: (0, youtube_1.buildYoutubePreview)(typeof req.body.youtubeUrl === "string" ? req.body.youtubeUrl : data.post?.youtubeUrl ?? ""),
                defaultYoutubeLabel: (0, media_1.getYoutubeDefaultLabel)(),
                errors: parsed.error.flatten().fieldErrors,
                values: req.body
            });
        }
        await post_service_1.postService.update(routeParam(req.params.id), {
            title: parsed.data.title,
            ...(parsed.data.slug ? { slug: parsed.data.slug } : {}),
            ...(parsed.data.subheadline ? { subheadline: parsed.data.subheadline } : {}),
            ...(parsed.data.excerpt ? { excerpt: parsed.data.excerpt } : {}),
            ...(parsed.data.youtubeUrl ? { youtubeUrl: parsed.data.youtubeUrl } : {}),
            ...(parsed.data.youtubeLabel ? { youtubeLabel: parsed.data.youtubeLabel } : {}),
            youtubePosition: parsed.data.youtubePosition,
            content: parsed.data.content,
            ...(parsed.data.featuredImage ? { featuredImage: parsed.data.featuredImage } : {}),
            bannerItems: parsed.data.bannerItems,
            ...(parsed.data.bannerImage ? { bannerImage: parsed.data.bannerImage } : {}),
            ...(parsed.data.bannerUrl ? { bannerUrl: parsed.data.bannerUrl } : {}),
            bannerPosition: parsed.data.bannerPosition,
            ...(parsed.data.seoTitle ? { seoTitle: parsed.data.seoTitle } : {}),
            ...(parsed.data.seoDescription ? { seoDescription: parsed.data.seoDescription } : {}),
            status: parsed.data.status,
            ...(parsed.data.categoryNames ? { categoryNames: parsed.data.categoryNames } : {}),
            categoryIds: parsed.data.categoryIds,
            tagIds: parsed.data.tagIds,
            ...(parsed.data.tagNames ? { tagNames: parsed.data.tagNames } : {}),
            faqItems: parsed.data.faqItems
        });
        return res.redirect((0, flash_1.appendNotice)("/admin/posts", "Post berhasil diperbarui.", "success"));
    },
    async preview(req, res) {
        const post = await post_service_1.postService.getEditFormData(routeParam(req.params.id));
        if (!post.post) {
            return res.status(404).render("errors/404", { layout: "layouts/blog", title: "Not found" });
        }
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const featuredImageUrl = post.post.featuredImage
            ? /^https?:\/\//i.test(post.post.featuredImage)
                ? post.post.featuredImage
                : (0, meta_1.buildCanonicalUrl)(baseUrl, post.post.featuredImage)
            : undefined;
        const bannerItems = (0, banner_1.resolveBannerItems)(post.post.bannerItems, {
            bannerImage: post.post.bannerImage,
            bannerUrl: post.post.bannerUrl,
            bannerPosition: post.post.bannerPosition
        }).map((item) => ({
            ...item,
            imageUrl: /^https?:\/\//i.test(item.image) ? item.image : (0, meta_1.buildCanonicalUrl)(baseUrl, item.image)
        }));
        const bannerImageUrl = bannerItems[0]?.imageUrl
            ? bannerItems[0].imageUrl
            : undefined;
        res.render("blog/post", {
            layout: "layouts/blog",
            title: post.post.seoTitle ?? post.post.title,
            meta: {
                title: post.post.seoTitle ?? post.post.title,
                description: post.post.seoDescription ?? post.post.excerpt ?? post.post.subheadline ?? post.post.title,
                canonical: `${baseUrl}/admin/posts/${post.post.id}/preview`,
                image: featuredImageUrl || bannerImageUrl,
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
            bannerImageUrl,
            bannerItems,
            youtubePreview: (0, youtube_1.buildYoutubePreview)(post.post.youtubeUrl),
            isPreview: true,
            defaultYoutubeLabel: (0, media_1.getYoutubeDefaultLabel)()
        });
    },
    async publish(req, res) {
        await post_service_1.postService.setStatus(routeParam(req.params.id), "PUBLISHED");
        return res.redirect((0, flash_1.appendNotice)("/admin/posts", "Post berhasil dipublish.", "success"));
    },
    async draft(req, res) {
        await post_service_1.postService.setStatus(routeParam(req.params.id), "DRAFT");
        return res.redirect((0, flash_1.appendNotice)("/admin/posts", "Post berhasil dijadikan draft.", "success"));
    },
    async destroy(req, res) {
        await post_service_1.postService.delete(routeParam(req.params.id));
        res.redirect((0, flash_1.appendNotice)("/admin/posts", "Post berhasil dihapus.", "success"));
    }
};
