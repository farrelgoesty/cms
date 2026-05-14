import fs from "fs";
import path from "path";
import type { Request, Response } from "express";
import { mediaRepository } from "../repositories/media.repository";

function routeParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";
}

function sendMedia(res: Response, media: Awaited<ReturnType<typeof mediaRepository.findById>>, useThumbnail = false) {
  if (!media) {
    return res.status(404).end();
  }

  const filename = media.fileName || "file";
  const data = useThumbnail ? media.thumbnailData ?? media.fileData : media.fileData;

  if (data) {
    res.setHeader("Content-Type", media.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${filename.replace(/"/g, '\\"')}"`);
    res.send(Buffer.from(data));
    return;
  }

  const publicPath = path.join(process.cwd(), "public", (useThumbnail ? media.thumbnailPath : media.filePath)?.replace(/^\//, "") || "");
  if (publicPath && fs.existsSync(publicPath)) {
    res.sendFile(publicPath);
    return;
  }

  res.status(404).end();
}

export const mediaController = {
  async show(req: Request, res: Response) {
    const media = await mediaRepository.findById(routeParam(req.params.id));
    return sendMedia(res, media, false);
  },

  async thumbnail(req: Request, res: Response) {
    const media = await mediaRepository.findById(routeParam(req.params.id));
    return sendMedia(res, media, true);
  }
};
