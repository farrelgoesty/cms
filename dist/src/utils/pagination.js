"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPagination = getPagination;
exports.buildPagination = buildPagination;
function getPagination(page = 1, limit = 10) {
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 10;
    return {
        page: safePage,
        limit: safeLimit,
        skip: (safePage - 1) * safeLimit
    };
}
function buildPagination(page, total, limit, windowSize = 1) {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(Math.max(page, 1), totalPages);
    const start = Math.max(1, currentPage - windowSize);
    const end = Math.min(totalPages, currentPage + windowSize);
    const pages = [];
    for (let number = start; number <= end; number += 1) {
        pages.push({
            number,
            current: number === currentPage
        });
    }
    return {
        page: currentPage,
        total,
        limit,
        totalPages,
        hasPrev: currentPage > 1,
        hasNext: currentPage < totalPages,
        prevPage: currentPage > 1 ? currentPage - 1 : 1,
        nextPage: currentPage < totalPages ? currentPage + 1 : totalPages,
        pages
    };
}
