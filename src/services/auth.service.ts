import bcrypt from "bcrypt";
import crypto from "crypto";
import { userRepository } from "../repositories/user.repository";
import { prisma } from "../config/prisma";
import { signAccessToken, signRefreshToken } from "../utils/jwt";
import type { User } from "@prisma/client";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function issueSession(user: Pick<User, "id" | "email" | "name" | "role" | "avatar">) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar
  } as const;

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() }
  });

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
    }
  });

  return { accessToken, refreshToken };
}

export const authService = {
  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    if (!user || user.role !== "ADMIN") {
      throw new Error("Email atau password tidak valid.");
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error("Email atau password tidak valid.");
    }

    const { accessToken, refreshToken } = await issueSession(user);

    return { user, accessToken, refreshToken };
  },

  async register(input: { name: string; email: string; password: string }) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new Error("Email sudah terdaftar. Silakan login atau gunakan email lain.");
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);
    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      password: hashedPassword,
      role: "ADMIN"
    });

    const { accessToken, refreshToken } = await issueSession(user);
    return { user, accessToken, refreshToken };
  },

  async revokeRefreshToken(token?: string) {
    if (!token) return;

    await prisma.refreshToken.updateMany({
      where: { token: hashToken(token) },
      data: { revokedAt: new Date() }
    });
  }
};
