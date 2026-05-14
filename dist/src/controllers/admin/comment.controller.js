"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentController = void 0;
const client_1 = require("@prisma/client");
const comment_service_1 = require("../../services/comment.service");
const pagination_1 = require("../../utils/pagination");
const flash_1 = require("../../utils/flash");
function pageQuery(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
function routeParam(value) {
    return typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";
}
function buildPageUrl(page, q = "", status = "ALL") {
    const params = new URLSearchParams();
    if (q) {
        params.set("q", q);
    }
    if (status && status !== "ALL") {
        params.set("status", status);
    }
    if (page > 1) {
        params.set("page", String(page));
    }
    const search = params.toString();
    return search ? `/admin/comments?${search}` : "/admin/comments";
}
exports.commentController = {
    async index(req, res) {
        const page = pageQuery(req.query.page);
        const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
        const status = req.query.status ?? "ALL";
        const { items, total } = await comment_service_1.commentService.listAdmin(page, 10, { q, status });
        const pagination = (0, pagination_1.buildPagination)(page, total, 10);
        res.render("admin/comments/index", {
            layout: "layouts/admin",
            title: "Comments",
            comments: items,
            total,
            page,
            q,
            status,
            pagination: {
                ...pagination,
                prevUrl: buildPageUrl(pagination.page - 1, q, status),
                nextUrl: buildPageUrl(pagination.page + 1, q, status),
                pages: pagination.pages.map((item) => ({
                    ...item,
                    url: buildPageUrl(item.number, q, status)
                }))
            }
        });
    },
    async updateStatus(req, res) {
        const status = req.body.status;
        if (status === client_1.CommentStatus.APPROVED) {
            await comment_service_1.commentService.approve(routeParam(req.params.id));
        }
        else if (status === client_1.CommentStatus.SPAM) {
            await comment_service_1.commentService.spam(routeParam(req.params.id));
        }
        else {
            return res.redirect((0, flash_1.appendNotice)(req.get("referer") ?? "/admin/comments", "Status komentar tidak valid.", "warning"));
        }
        res.redirect((0, flash_1.appendNotice)(req.get("referer") ?? "/admin/comments", `Komentar berhasil ${status === client_1.CommentStatus.APPROVED ? "disetujui" : "ditandai spam"}.`, "success"));
    },
    async destroy(req, res) {
        await comment_service_1.commentService.delete(routeParam(req.params.id));
        res.redirect((0, flash_1.appendNotice)(req.get("referer") ?? "/admin/comments", "Komentar berhasil dihapus.", "success"));
    }
};
