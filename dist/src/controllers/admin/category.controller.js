"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryController = void 0;
const category_service_1 = require("../../services/category.service");
const category_validation_1 = require("../../validations/category.validation");
const pagination_1 = require("../../utils/pagination");
const flash_1 = require("../../utils/flash");
function pageQuery(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
function routeParam(value) {
    return typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";
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
    return search ? `/admin/categories?${search}` : "/admin/categories";
}
exports.categoryController = {
    async index(req, res) {
        const page = pageQuery(req.query.page);
        const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
        const { items, total } = await category_service_1.categoryService.listAdmin(page, 9, q);
        const pagination = (0, pagination_1.buildPagination)(page, total, 9);
        const editingId = typeof req.query.edit === "string" ? req.query.edit : "";
        const editingCategory = editingId ? await category_service_1.categoryService.findById(editingId) : null;
        res.render("admin/categories/index", {
            layout: "layouts/admin",
            title: "Categories",
            categories: items,
            total,
            page,
            q,
            editingCategory,
            pagination: {
                ...pagination,
                prevUrl: buildPageUrl(pagination.page - 1, q),
                nextUrl: buildPageUrl(pagination.page + 1, q),
                pages: pagination.pages.map((item) => ({
                    ...item,
                    url: buildPageUrl(item.number, q)
                }))
            },
            errors: undefined,
            values: {}
        });
    },
    async store(req, res) {
        const parsed = category_validation_1.categorySchema.safeParse(req.body);
        const page = pageQuery(req.query.page);
        const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
        const { items, total } = await category_service_1.categoryService.listAdmin(page, 9, q);
        const pagination = (0, pagination_1.buildPagination)(page, total, 9);
        if (!parsed.success) {
            return res.status(422).render("admin/categories/index", {
                layout: "layouts/admin",
                title: "Categories",
                notice: "Periksa kembali isian category.",
                noticeType: "warning",
                categories: items,
                total,
                page,
                q,
                editingCategory: null,
                pagination: {
                    ...pagination,
                    prevUrl: buildPageUrl(pagination.page - 1, q),
                    nextUrl: buildPageUrl(pagination.page + 1, q),
                    pages: pagination.pages.map((item) => ({
                        ...item,
                        url: buildPageUrl(item.number, q)
                    }))
                },
                errors: parsed.error.flatten().fieldErrors,
                values: req.body
            });
        }
        await category_service_1.categoryService.create(parsed.data.name);
        return res.redirect((0, flash_1.appendNotice)(buildPageUrl(page, q), "Category berhasil ditambahkan.", "success"));
    },
    async editForm(req, res) {
        const page = pageQuery(req.query.page);
        const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
        const { items, total } = await category_service_1.categoryService.listAdmin(page, 9, q);
        const pagination = (0, pagination_1.buildPagination)(page, total, 9);
        const editingCategory = await category_service_1.categoryService.findById(routeParam(req.params.id));
        if (!editingCategory) {
            return res.status(404).render("errors/404", { layout: "layouts/blog", title: "Not found" });
        }
        return res.render("admin/categories/index", {
            layout: "layouts/admin",
            title: "Categories",
            categories: items,
            total,
            page,
            q,
            editingCategory,
            pagination: {
                ...pagination,
                prevUrl: buildPageUrl(pagination.page - 1, q),
                nextUrl: buildPageUrl(pagination.page + 1, q),
                pages: pagination.pages.map((item) => ({
                    ...item,
                    url: buildPageUrl(item.number, q)
                }))
            },
            errors: undefined,
            values: {}
        });
    },
    async update(req, res) {
        const parsed = category_validation_1.categorySchema.safeParse(req.body);
        const page = pageQuery(req.query.page);
        const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
        const { items, total } = await category_service_1.categoryService.listAdmin(page, 9, q);
        const pagination = (0, pagination_1.buildPagination)(page, total, 9);
        if (!parsed.success) {
            return res.status(422).render("admin/categories/index", {
                layout: "layouts/admin",
                title: "Categories",
                notice: "Periksa kembali isian category.",
                noticeType: "warning",
                categories: items,
                total,
                page,
                q,
                editingCategory: await category_service_1.categoryService.findById(routeParam(req.params.id)),
                pagination: {
                    ...pagination,
                    prevUrl: buildPageUrl(pagination.page - 1, q),
                    nextUrl: buildPageUrl(pagination.page + 1, q),
                    pages: pagination.pages.map((item) => ({
                        ...item,
                        url: buildPageUrl(item.number, q)
                    }))
                },
                errors: parsed.error.flatten().fieldErrors,
                values: req.body
            });
        }
        await category_service_1.categoryService.update(routeParam(req.params.id), parsed.data.name);
        return res.redirect((0, flash_1.appendNotice)(buildPageUrl(page, q), "Category berhasil diperbarui.", "success"));
    },
    async destroy(req, res) {
        await category_service_1.categoryService.delete(routeParam(req.params.id));
        const page = pageQuery(req.query.page);
        const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
        return res.redirect((0, flash_1.appendNotice)(buildPageUrl(page, q), "Category berhasil dihapus.", "success"));
    }
};
