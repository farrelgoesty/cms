import { prisma } from "../config/prisma";
import type { UserRole } from "@prisma/client";

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  create(input: { name: string; email: string; password: string; role?: UserRole }) {
    return prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: input.password,
        role: input.role ?? "ADMIN"
      }
    });
  },

  updateProfile(
    id: string,
    input: {
      name: string;
      email: string;
      avatar?: string | null;
      bio?: string | null;
    }
  ) {
    return prisma.user.update({
      where: { id },
      data: {
        name: input.name,
        email: input.email,
        ...(input.avatar ? { avatar: input.avatar } : { avatar: null }),
        ...(input.bio ? { bio: input.bio } : { bio: null })
      }
    });
  },

  updatePassword(id: string, password: string) {
    return prisma.user.update({
      where: { id },
      data: { password }
    });
  }
};
