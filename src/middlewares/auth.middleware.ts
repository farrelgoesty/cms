import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { userRepository } from "../repositories/user.repository";
import { normalizePublicUrl } from "../utils/public-url";

export function attachUser(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.access_token as string | undefined;

  if (!token) {
    next();
    return;
  }

  try {
    req.authUser = verifyAccessToken(token);
  } catch {
    req.authUser = undefined;
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.authUser) {
    res.redirect("/admin/login");
    return;
  }

  next();
}

export function redirectIfAuth(req: Request, res: Response, next: NextFunction) {
  if (req.authUser) {
    res.redirect("/admin/dashboard");
    return;
  }

  next();
}

export async function attachLocals(req: Request, res: Response, next: NextFunction) {
  if (req.authUser) {
    const user = await userRepository.findById(req.authUser.id);
    res.locals.user = user
      ? {
          ...req.authUser,
          avatar: normalizePublicUrl(user.avatar)
        }
      : req.authUser;
  } else {
    res.locals.user = undefined;
  }
  res.locals.currentYear = new Date().getFullYear();
  res.locals.currentPath = req.path;
  res.locals.notice = typeof req.query.notice === "string" ? req.query.notice.trim() : "";
  res.locals.noticeType = typeof req.query.noticeType === "string" ? req.query.noticeType.trim() : "";
  next();
}
