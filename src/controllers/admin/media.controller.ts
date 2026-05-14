import type { Request, Response } from "express";
import { mediaService } from "../../services/media.service";
import { uploadImage } from "../../middlewares/upload.middleware";
import { csrfProtection } from "../../middlewares/csrf.middleware";
import { buildPagination } from "../../utils/pagination";
import { getMediaTypeFilterOptions } from "../../utils/media";
import { appendNotice } from "../../utils/flash";

function pageQuery(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function routeParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";
}

function mediaType(value: unknown) {
  const type = typeof value === "string" ? value : "";
  return type === "image" || type === "video" || type === "document" ? type : "all";
}

function buildPageUrl(page: number, q = "", type = "all") {
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

export const mediaController = {
  list: async (req: Request, res: Response) => {
    const page = pageQuery(req.query.page);
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const type = mediaType(req.query.type);
    const { items, total } = await mediaService.list(page, 8, q, type);
    const pagination = buildPagination(page, total, 8);

    res.render("admin/media/index", {
      layout: "layouts/admin",
      title: "Media Library",
      media: items,
      mediaTypes: getMediaTypeFilterOptions(),
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

  async api(req: Request, res: Response) {
    const page = pageQuery(req.query.page);
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const type = mediaType(req.query.type);
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 48);
    const { items, total } = await mediaService.list(page, limit, q, type);
    const pagination = buildPagination(page, total, limit);

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
    uploadImage.single("image"),
    csrfProtection,
    async (req: Request, res: Response) => {
      if (!req.file || !req.authUser) {
        if (req.query.source === "library") {
          return res.redirect(appendNotice("/admin/media", "Silakan pilih file terlebih dahulu.", "warning"));
        }
        return res.status(400).json({ error: "No file uploaded" });
      }

      const media = await mediaService.processUpload(req.file, req.authUser.id);

      if (req.query.source === "library") {
        return res.redirect(appendNotice("/admin/media", "Media berhasil diupload.", "success"));
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

  async destroy(req: Request, res: Response) {
    await mediaService.delete(routeParam(req.params.id));
    res.redirect(appendNotice("/admin/media", "Media berhasil dihapus.", "success"));
  }
};
