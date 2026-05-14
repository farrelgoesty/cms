"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = void 0;
const prisma_1 = require("../config/prisma");
exports.userRepository = {
    findByEmail(email) {
        return prisma_1.prisma.user.findUnique({ where: { email } });
    },
    findById(id) {
        return prisma_1.prisma.user.findUnique({ where: { id } });
    },
    create(input) {
        return prisma_1.prisma.user.create({
            data: {
                name: input.name,
                email: input.email,
                password: input.password,
                role: input.role ?? "ADMIN"
            }
        });
    },
    updateProfile(id, input) {
        return prisma_1.prisma.user.update({
            where: { id },
            data: {
                name: input.name,
                email: input.email,
                ...(input.avatar ? { avatar: input.avatar } : { avatar: null }),
                ...(input.bio ? { bio: input.bio } : { bio: null })
            }
        });
    },
    updatePassword(id, password) {
        return prisma_1.prisma.user.update({
            where: { id },
            data: { password }
        });
    }
};
