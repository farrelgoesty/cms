"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaController = void 0;
const media_service_1 = require("../../services/media.service");
const upload_middleware_1 = require("../../middlewares/upload.middleware");
const csrf_middleware_1 = require("../../middlewares/csrf.middleware");
const pagination_1 = require("../../utils/pagination");
const media_1 = require("../../utils/media");
const flash_1 = require("../../utils/flash");
function pageQuery(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
function routeParam(value) {
    return typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";
}
function mediaType(value) {
    const type = typeof value === "string" ? value : "";
    return type === "image" || type === "video" || type === "document" ? type : "all";
}
function buildPageUrl(page, q = "", type = "all") {
    const params = new URLSearchParams();
    if (q) {
        params.set("q", q);
    }
    if (type && type !== "all") {
        params.set("type", type);
    }
    if (page > 1) {
        params.set("page", String(page));
    }
    const search = params.toString();
    return search ? `/admin/media?${search}` : "/admin/media";
}
exports.mediaController = {
    list: async (req, res) => {
        const page = pageQuery(req.query.page);
        const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
        const type = mediaType(req.query.type);
        const { items, total } = await media_service_1.mediaService.list(page, 8, q, type);
        const pagination = (0, pagination_1.buildPagination)(page, total, 8);
        res.render("admin/media/index", {
            layout: "layouts/admin",
            title: "Media Library",
            media: items,
            mediaTypes: (0, media_1.getMediaTypeFilterOptions)(),
            total,
            page,
            q,
            type,
            pagination: {
                ...pagination,
                prevUrl: buildPageUrl(pagination.page - 1, q, type),
                nextUrl: buildPageUrl(pagination.page + 1, q, type),
                pages: pagination.pages.map((item) => ({
                    ...item,
                    url: buildPageUrl(item.number, q, type)
                }))
            }
        });
    },
    async api(req, res) {
        const page = pageQuery(req.query.page);
        const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
        const type = mediaType(req.query.type);
        const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 48);
        const { items, total } = await media_service_1.mediaService.list(page, limit, q, type);
        const pagination = (0, pagination_1.buildPagination)(page, total, limit);
        res.json({
            items,
            total,
            page,
            type,
            q,
            hasMore: pagination.page < pagination.totalPages,
            pagination: {
                ...pagination,
                prevPage: pagination.prevPage,
                nextPage: pagination.nextPage
            }
        });
    },
    upload: [
        upload_middleware_1.uploadImage.single("image"),
        csrf_middleware_1.csrfProtection,
        async (req, res) => {
            if (!req.file || !req.authUser) {
                if (req.query.source === "library") {
                    return res.redirect((0, flash_1.appendNotice)("/admin/media", "Silakan pilih file terlebih dahulu.", "warning"));
                }
                return res.status(400).json({ error: "No file uploaded" });
            }
            const media = await media_service_1.mediaService.processUpload(req.file, req.authUser.id);
            if (req.query.source === "library") {
                return res.redirect((0, flash_1.appendNotice)("/admin/media", "Media berhasil diupload.", "success"));
            }
            return res.json({
                location: media.filePath,
                preview: media.previewUrl,
                kind: media.kind,
                media,
                notice: "Media berhasil diupload."
            });
        }
    ],
    async destroy(req, res) {
        await media_service_1.mediaService.delete(routeParam(req.params.id));
        res.redirect((0, flash_1.appendNotice)("/admin/media", "Media berhasil dihapus.", "success"));
    }
};
