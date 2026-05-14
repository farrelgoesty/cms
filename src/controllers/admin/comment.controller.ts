import type { Request, Response } from "express";
import { CommentStatus } from "@prisma/client";
import { commentService } from "../../services/comment.service";
import { buildPagination } from "../../utils/pagination";
import { appendNotice } from "../../utils/flash";

function pageQuery(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function routeParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";
}

function buildPageUrl(page: number, q = "", status: string = "ALL") {
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

export const commentController = {
  async index(req: Request, res: Response) {
    const page = pageQuery(req.query.page);
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const status = (req.query.status as CommentStatus | "ALL" | undefined) ?? "ALL";
    const { items, total } = await commentService.listAdmin(page, 10, { q, status });
    const pagination = buildPagination(page, total, 10);

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

  async updateStatus(req: Request, res: Response) {
    const status = req.body.status as CommentStatus;
    if (status === CommentStatus.APPROVED) {
      await commentService.approve(routeParam(req.params.id));
    } else if (status === CommentStatus.SPAM) {
      await commentService.spam(routeParam(req.params.id));
    } else {
      return res.redirect(appendNotice(req.get("referer") ?? "/admin/comments", "Status komentar tidak valid.", "warning"));
    }

    res.redirect(
      appendNotice(
        req.get("referer") ?? "/admin/comments",
        `Komentar berhasil ${status === CommentStatus.APPROVED ? "disetujui" : "ditandai spam"}.`,
        "success"
      )
    );
  },

  async destroy(req: Request, res: Response) {
    await commentService.delete(routeParam(req.params.id));
    res.redirect(appendNotice(req.get("referer") ?? "/admin/comments", "Komentar berhasil dihapus.", "success"));
  }
};
