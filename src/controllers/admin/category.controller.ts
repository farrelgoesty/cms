import type { Request, Response } from "express";
import { categoryService } from "../../services/category.service";
import { categorySchema } from "../../validations/category.validation";
import { buildPagination } from "../../utils/pagination";
import { appendNotice } from "../../utils/flash";

function pageQuery(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function routeParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";
}

function buildPageUrl(page: number, q = "") {
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

export const categoryController = {
  async index(req: Request, res: Response) {
    const page = pageQuery(req.query.page);
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const { items, total } = await categoryService.listAdmin(page, 9, q);
    const pagination = buildPagination(page, total, 9);
    const editingId = typeof req.query.edit === "string" ? req.query.edit : "";
    const editingCategory = editingId ? await categoryService.findById(editingId) : null;

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

  async store(req: Request, res: Response) {
    const parsed = categorySchema.safeParse(req.body);
    const page = pageQuery(req.query.page);
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const { items, total } = await categoryService.listAdmin(page, 9, q);
    const pagination = buildPagination(page, total, 9);

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

    await categoryService.create(parsed.data.name);
    return res.redirect(appendNotice(buildPageUrl(page, q), "Category berhasil ditambahkan.", "success"));
  },

  async editForm(req: Request, res: Response) {
    const page = pageQuery(req.query.page);
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const { items, total } = await categoryService.listAdmin(page, 9, q);
    const pagination = buildPagination(page, total, 9);
    const editingCategory = await categoryService.findById(routeParam(req.params.id));

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

  async update(req: Request, res: Response) {
    const parsed = categorySchema.safeParse(req.body);
    const page = pageQuery(req.query.page);
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const { items, total } = await categoryService.listAdmin(page, 9, q);
    const pagination = buildPagination(page, total, 9);

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
        editingCategory: await categoryService.findById(routeParam(req.params.id)),
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

    await categoryService.update(routeParam(req.params.id), parsed.data.name);
    return res.redirect(appendNotice(buildPageUrl(page, q), "Category berhasil diperbarui.", "success"));
  },

  async destroy(req: Request, res: Response) {
    await categoryService.delete(routeParam(req.params.id));
    const page = pageQuery(req.query.page);
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    return res.redirect(appendNotice(buildPageUrl(page, q), "Category berhasil dihapus.", "success"));
  }
};
