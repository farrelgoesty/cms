import type { Request, Response } from "express";
import { authService } from "../../services/auth.service";
import { loginSchema, registerSchema } from "../../validations/auth.validation";
import { appendNotice } from "../../utils/flash";

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

export const authController = {
  getLogin(req: Request, res: Response) {
    res.render("admin/auth/login", {
      layout: "layouts/admin",
      title: "Admin Login",
      authPage: true
    });
  },

  getRegister(req: Request, res: Response) {
    res.render("admin/auth/register", {
      layout: "layouts/admin",
      title: "Register Admin",
      authPage: true
    });
  },

  async postLogin(req: Request, res: Response) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).render("admin/auth/login", {
        layout: "layouts/admin",
        title: "Admin Login",
        authPage: true,
        notice: "Periksa kembali email dan password Anda.",
        noticeType: "warning",
        errors: parsed.error.flatten().fieldErrors,
        values: req.body
      });
    }

    try {
      const result = await authService.login(parsed.data.email, parsed.data.password);
      setAuthCookies(res, result.accessToken, result.refreshToken);
      return res.redirect(appendNotice("/admin/dashboard", "Login berhasil.", "success"));
    } catch (error) {
      return res.status(401).render("admin/auth/login", {
        layout: "layouts/admin",
        title: "Admin Login",
        authPage: true,
        notice: error instanceof Error ? error.message : "Login gagal",
        noticeType: "error",
        error: error instanceof Error ? error.message : "Login failed",
        values: req.body
      });
    }
  },

  async postRegister(req: Request, res: Response) {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).render("admin/auth/register", {
        layout: "layouts/admin",
        title: "Register Admin",
        authPage: true,
        notice: "Periksa kembali data registrasi Anda.",
        noticeType: "warning",
        errors: parsed.error.flatten().fieldErrors,
        values: req.body
      });
    }

    try {
      await authService.register(parsed.data);
      return res.redirect(appendNotice("/admin/login", "Registrasi berhasil. Silakan login.", "success"));
    } catch (error) {
      return res.status(409).render("admin/auth/register", {
        layout: "layouts/admin",
        title: "Register Admin",
        authPage: true,
        notice: error instanceof Error ? error.message : "Registrasi gagal",
        noticeType: "error",
        error: error instanceof Error ? error.message : "Registrasi gagal",
        values: req.body
      });
    }
  },

  async logout(req: Request, res: Response) {
    await authService.revokeRefreshToken(req.cookies?.refresh_token);
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    res.redirect(appendNotice("/admin/login", "Logout berhasil.", "info"));
  }
};
