import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import fs from "fs";

export function notFound(req: Request, res: Response) {
  res.status(404).render("errors/404", {
    layout: "layouts/blog",
    title: "Page not found"
  });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const message = err instanceof Error ? err.message : "Internal server error";
  const statusCode =
    message.includes("CSRF token")
      ? 403
      : err instanceof multer.MulterError || message.includes("Format file tidak didukung") || message.includes("File too large") || message.includes("SVG tidak aman")
        ? 400
        : 500;

  const uploadErrorMessage = message.includes("File too large")
    ? "Ukuran file maksimal 5 MB."
    : message.includes("Format file tidak didukung")
      ? "Format file tidak didukung. Gunakan image, video, atau PDF yang valid."
      : message.includes("SVG tidak aman")
        ? "SVG tidak aman. Hapus script atau event handler sebelum upload."
      : message;

  if (res.headersSent) {
    return;
  }

  if (req.file?.path) {
    fs.promises.unlink(req.file.path).catch(() => undefined);
  }

  if (req.path === "/admin/media/upload") {
    res.status(statusCode).json({ error: uploadErrorMessage });
    return;
  }

  if (statusCode === 403) {
    res.status(statusCode).render("errors/403", {
      layout: "layouts/blog",
      title: "Forbidden",
      message
    });
    return;
  }

  res.status(statusCode).render("errors/500", {
    layout: "layouts/blog",
    title: "Something went wrong",
    message: uploadErrorMessage
  });
}
