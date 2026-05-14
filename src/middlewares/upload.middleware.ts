import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { isAllowedMediaUpload, MAX_MEDIA_UPLOAD_BYTES, getMediaKind } from "../utils/media";

const uploadRoot = path.join(process.cwd(), "public", "uploads");
const tempRoot = path.join(uploadRoot, "tmp");

fs.mkdirSync(tempRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tempRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".bin";
    cb(null, `${crypto.randomUUID()}${ext}`);
  }
});

export const uploadImage = multer({
  storage,
  limits: { fileSize: MAX_MEDIA_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!isAllowedMediaUpload(file)) {
      cb(new Error("Format file tidak didukung. Gunakan image, video, atau PDF yang valid."));
      return;
    }

    cb(null, true);
  }
});

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: MAX_MEDIA_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    const kind = getMediaKind(file.mimetype);
    if (kind !== "image") {
      cb(new Error("Avatar hanya boleh berupa gambar."));
      return;
    }

    cb(null, true);
  }
});
