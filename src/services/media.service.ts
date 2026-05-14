import crypto from "crypto";
import fs from "fs";
import sharp from "sharp";
import { mediaRepository } from "../repositories/media.repository";
import { sanitizePlainText } from "../utils/sanitize";
import {
  buildMediaPreviewUrl,
  getMediaKind,
  MAX_MEDIA_UPLOAD_MB,
  isSafeSvgContent
} from "../utils/media";

function decorateMedia(item: Awaited<ReturnType<typeof mediaRepository.list>>[number]) {
  const kind = getMediaKind(item.mimeType);
  return {
    ...item,
    kind,
    kindLabel: kind.charAt(0).toUpperCase() + kind.slice(1),
    previewUrl: buildMediaPreviewUrl(item.filePath, item.thumbnailPath, item.mimeType),
    maxUploadMb: MAX_MEDIA_UPLOAD_MB
  };
}

type UploadMediaRow = NonNullable<Awaited<ReturnType<typeof mediaRepository.findById>>> | Awaited<ReturnType<typeof mediaRepository.findDuplicateCandidates>>[number];

function formatMediaResponse(item: UploadMediaRow) {
  const kind = getMediaKind(item.mimeType);
  return {
    id: item.id,
    fileName: item.fileName,
    filePath: item.filePath,
    thumbnailPath: item.thumbnailPath ?? null,
    mimeType: item.mimeType,
    fileSize: item.fileSize,
    width: item.width ?? null,
    height: item.height ?? null,
    altText: item.altText ?? null,
    uploadedById: item.uploadedById,
    postId: item.postId ?? null,
    createdAt: item.createdAt,
    kind,
    kindLabel: kind.charAt(0).toUpperCase() + kind.slice(1),
    previewUrl: buildMediaPreviewUrl(item.filePath, item.thumbnailPath, item.mimeType),
    maxUploadMb: MAX_MEDIA_UPLOAD_MB
  };
}

function isImageMimeType(mimeType: string) {
  return mimeType.startsWith("image/") && mimeType !== "image/svg+xml";
}

function isSafeImageUpload(file: Express.Multer.File, sourceBuffer: Buffer) {
  if (file.mimetype !== "image/svg+xml") {
    return true;
  }

  return isSafeSvgContent(sourceBuffer.toString("utf8"));
}

async function findDuplicateMedia(mimeType: string, fileSize: number, fileData: Buffer) {
  const candidates = await mediaRepository.findDuplicateCandidates({
    mimeType,
    fileSize
  });

  return candidates.find((candidate) => {
    if (!candidate.fileData) {
      return false;
    }

    return candidate.fileData.length === fileData.length && crypto.timingSafeEqual(candidate.fileData, fileData);
  });
}

export const mediaService = {
  list(page: number, limit: number, q?: string, type?: "all" | "image" | "video" | "document") {
    const skip = (page - 1) * limit;
    return Promise.all([
      mediaRepository.list({
        skip,
        take: limit,
        ...(q ? { q } : {}),
        ...(type ? { type } : {})
      }),
      mediaRepository.count(q, type)
    ]).then(([items, total]) => ({ items: items.map(decorateMedia), total }));
  },

  async processUpload(file: Express.Multer.File, userId: string) {
    const sourceBuffer = await fs.promises.readFile(file.path);
    const fileName = sanitizePlainText(file.originalname);
    const imageUpload = isImageMimeType(file.mimetype);

    try {
      if (imageUpload && !isSafeImageUpload(file, sourceBuffer)) {
        throw new Error("SVG tidak aman. Hapus script atau event handler sebelum upload.");
      }

      let fileData: Buffer = sourceBuffer;
      let thumbnailData: Buffer | undefined;
      let width: number | undefined;
      let height: number | undefined;
      let storedMimeType = file.mimetype;

      if (imageUpload) {
        const optimized = await sharp(sourceBuffer)
          .resize({ width: 2200, withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer();

        const thumb = await sharp(sourceBuffer)
          .resize({ width: 480, height: 320, fit: "cover" })
          .webp({ quality: 78 })
          .toBuffer();

        const meta = await sharp(optimized).metadata();
        fileData = optimized;
        thumbnailData = thumb;
        storedMimeType = "image/webp";
        width = meta.width;
        height = meta.height;
      }

      const fileSize = fileData.length;
      const duplicate = await findDuplicateMedia(storedMimeType, fileSize, fileData);
      if (duplicate) {
        return formatMediaResponse(duplicate);
      }

      const created = await mediaRepository.create({
        fileName,
        filePath: "/media/pending",
        ...(thumbnailData ? { thumbnailPath: "/media/pending/thumbnail" } : {}),
        fileData,
        ...(thumbnailData ? { thumbnailData } : {}),
        mimeType: storedMimeType,
        fileSize,
        ...(width !== undefined ? { width } : {}),
        ...(height !== undefined ? { height } : {}),
        uploadedById: userId
      });

      const fileUrl = `/media/${created.id}/file`;
      const thumbnailUrl = thumbnailData ? `/media/${created.id}/thumbnail` : null;
      const updated = await mediaRepository.update(created.id, {
        filePath: fileUrl,
        ...(thumbnailUrl !== null ? { thumbnailPath: thumbnailUrl } : { thumbnailPath: null })
      });

      return formatMediaResponse(updated);
    } finally {
      await fs.promises.unlink(file.path).catch(() => undefined);
    }
  },

  async delete(id: string) {
    return mediaRepository.delete(id);
  }
};
