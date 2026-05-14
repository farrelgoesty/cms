"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagController = void 0;
const tag_service_1 = require("../../services/tag.service");
const tag_validation_1 = require("../../validations/tag.validation");
const pagination_1 = require("../../utils/pagination");
const flash_1 = require("../../utils/flash");
function pageQuery(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
function routeParam(value) {
    return typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";
}
function wantsJson(req) {
    const accept = String(req.headers.accept || "").toLowerCase();
    return req.xhr || accept.includes("application/json");
}
function buildPageUrl(page, q = "") {
    const params = new URLSearchParams();
    if (q) {
        params.set("q", q);
    }
    if (page > 1) {
        params.set("page", String(page));
    }
    const search = params.toString();
    return search ? `/admin/tags?${search}` : "/admin/tags";
}
function renderPage(res, options) {
    return res.render("admin/taxonomies/index", {
        layout: "layouts/admin",
        title: "Tags",
        taxonomyKind: "tag",
        taxonomyTitle: "Tags",
        taxonomySingular: "Tag",
        taxonomyCreateLabel: "Tambah Tag",
        taxonomyIcon: "fa-tags",
        ...options
    });
}
function renderListData(page, q) {
    return tag_service_1.tagService.listAdmin(page, 9, q).then(({ items, total }) => {
        const pagination = (0, pagination_1.buildPagination)(page, total, 9);
        return {
            tags: items,
            total,
            pagination: {
                ...pagination,
                prevUrl: buildPageUrl(pagination.page - 1, q),
                nextUrl: buildPageUrl(pagination.page + 1, q),
                pages: pagination.pages.map((item) => ({
                    ...item,
                    url: buildPageUrl(item.number, q)
                }))
            }
        };
    });
}
exports.tagController = {
    async index(req, res) {
        const page = pageQuery(req.query.page);
        const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
        const data = await renderListData(page, q);
        renderPage(res, {
            ...data,
            page,
            q,
            errors: undefined,
            values: {},
            editingTag: null
        });
    },
    async store(req, res) {
        const parsed = tag_validation_1.tagSchema.safeParse(req.body);
        const page = pageQuery(req.query.page);
        const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
        const data = await renderListData(page, q);
        if (!parsed.success) {
            if (wantsJson(req)) {
                return res.status(422).json({
                    error: "Periksa kembali isian tag.",
                    errors: parsed.error.flatten().fieldErrors
                });
            }
            return renderPage(res.status(422), {
                ...data,
                page,
                q,
                notice: "Periksa kembali isian tag.",
                noticeType: "warning",
                editingTag: null,
                errors: parsed.error.flatten().fieldErrors,
                values: req.body
            });
        }
        const item = await tag_service_1.tagService.create(parsed.data.name);
        if (wantsJson(req)) {
            return res.json({ item });
        }
        return res.redirect((0, flash_1.appendNotice)(buildPageUrl(page, q), "Tag berhasil ditambahkan.", "success"));
    },
    async editForm(req, res) {
        const page = pageQuery(req.query.page);
        const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
        const data = await renderListData(page, q);
        const editingTag = await tag_service_1.tagService.findById(routeParam(req.params.id));
        if (!editingTag) {
            return res.status(404).render("errors/404", { layout: "layouts/blog", title: "Not found" });
        }
        return renderPage(res, {
            ...data,
            page,
            q,
            editingTag,
            errors: undefined,
            values: {}
        });
    },
    async update(req, res) {
        const parsed = tag_validation_1.tagSchema.safeParse(req.body);
        const page = pageQuery(req.query.page);
        const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
        const data = await renderListData(page, q);
        const editingTag = await tag_service_1.tagService.findById(routeParam(req.params.id));
        if (!parsed.success) {
            if (wantsJson(req)) {
                return res.status(422).json({
                    error: "Periksa kembali isian tag.",
                    errors: parsed.error.flatten().fieldErrors
                });
            }
            return renderPage(res.status(422), {
                ...data,
                page,
                q,
                notice: "Periksa kembali isian tag.",
                noticeType: "warning",
                editingTag,
                errors: parsed.error.flatten().fieldErrors,
                values: req.body
            });
        }
        const item = await tag_service_1.tagService.update(routeParam(req.params.id), parsed.data.name);
        if (wantsJson(req)) {
            return res.json({ item });
        }
        return res.redirect((0, flash_1.appendNotice)(buildPageUrl(page, q), "Tag berhasil diperbarui.", "success"));
    },
    async destroy(req, res) {
        await tag_service_1.tagService.delete(routeParam(req.params.id));
        const page = pageQuery(req.query.page);
        const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
        if (wantsJson(req)) {
            return res.json({ success: true, id: routeParam(req.params.id) });
        }
        return res.redirect((0, flash_1.appendNotice)(buildPageUrl(page, q), "Tag berhasil dihapus.", "success"));
    }
};
