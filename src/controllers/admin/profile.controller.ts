import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import fs from "fs";
import { appendNotice } from "../../utils/flash";
import { profileSchema, passwordSchema } from "../../validations/profile.validation";
import { userRepository } from "../../repositories/user.repository";
import { issueSession } from "../../services/auth.service";
import { sanitizePlainText } from "../../utils/sanitize";
import { normalizePublicUrl } from "../../utils/public-url";
import { mediaService } from "../../services/media.service";

function normalizeProfile(profile: Awaited<ReturnType<typeof userRepository.findById>> | null) {
  if (!profile) {
    return profile;
  }

  return {
    ...profile,
    avatar: normalizePublicUrl(profile.avatar)
  };
}

async function cleanupTempUpload(file?: Express.Multer.File) {
  if (file?.path) {
    await fs.promises.unlink(file.path).catch(() => undefined);
  }
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie("access_token", accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 2
  });
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 30
  });
}

export const profileController = {
  async index(req: Request, res: Response) {
    const profile = await userRepository.findById(req.authUser!.id);
    if (!profile) {
      return res.status(404).render("errors/404", { layout: "layouts/admin", title: "Not found" });
    }

    res.render("admin/profile/index", {
      layout: "layouts/admin",
      title: "Profile",
      profile: normalizeProfile(profile)
    });
  },

  async updateProfile(req: Request, res: Response) {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      const profile = await userRepository.findById(req.authUser!.id);
      await cleanupTempUpload(req.file);
      return res.status(422).render("admin/profile/index", {
        layout: "layouts/admin",
        title: "Profile",
        profile: normalizeProfile(profile),
        profileErrors: parsed.error.flatten().fieldErrors,
        profileValues: req.body
      });
    }

    const current = await userRepository.findById(req.authUser!.id);
    if (!current) {
      return res.redirect("/admin/login");
    }

    const existing = await userRepository.findByEmail(parsed.data.email);
    if (existing && existing.id !== current.id) {
      const profile = await userRepository.findById(req.authUser!.id);
      await cleanupTempUpload(req.file);
      return res.status(409).render("admin/profile/index", {
        layout: "layouts/admin",
        title: "Profile",
        profile: normalizeProfile(profile),
        profileErrors: { email: ["Email sudah dipakai akun lain."] },
        profileValues: req.body
      });
    }

    let avatar = current.avatar;
    if (req.file) {
      const uploadedAvatar = await mediaService.processUpload(req.file, current.id);
      avatar = uploadedAvatar.filePath;
    } else if (typeof parsed.data.avatar === "string" && parsed.data.avatar.trim()) {
      avatar = normalizePublicUrl(sanitizePlainText(parsed.data.avatar));
    }

    const updated = await userRepository.updateProfile(current.id, {
      name: sanitizePlainText(parsed.data.name),
      email: sanitizePlainText(parsed.data.email),
      avatar,
      ...(parsed.data.bio ? { bio: sanitizePlainText(parsed.data.bio) } : {})
    });

    const { accessToken, refreshToken } = await issueSession(updated);
    setAuthCookies(res, accessToken, refreshToken);

    return res.redirect(appendNotice("/admin/profile", "Profile berhasil diperbarui.", "success"));
  },

  async updatePassword(req: Request, res: Response) {
    const parsed = passwordSchema.safeParse(req.body);
    if (!parsed.success) {
      const profile = await userRepository.findById(req.authUser!.id);
      return res.status(422).render("admin/profile/index", {
        layout: "layouts/admin",
        title: "Profile",
        profile: normalizeProfile(profile),
        passwordErrors: parsed.error.flatten().fieldErrors,
        passwordValues: req.body
      });
    }

    const current = await userRepository.findById(req.authUser!.id);
    if (!current) {
      return res.redirect("/admin/login");
    }

    const valid = await bcrypt.compare(parsed.data.currentPassword, current.password);
    if (!valid) {
      const profile = await userRepository.findById(req.authUser!.id);
      return res.status(401).render("admin/profile/index", {
        layout: "layouts/admin",
        title: "Profile",
        profile: normalizeProfile(profile),
        passwordErrors: { currentPassword: ["Password saat ini tidak valid."] },
        passwordValues: req.body
      });
    }

    const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12);
    const updated = await userRepository.updatePassword(current.id, hashedPassword);
    const { accessToken, refreshToken } = await issueSession(updated);
    setAuthCookies(res, accessToken, refreshToken);

    return res.redirect(appendNotice("/admin/profile", "Password berhasil diperbarui.", "success"));
  }
};
