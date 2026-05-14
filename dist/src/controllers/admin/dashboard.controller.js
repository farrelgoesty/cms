"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardController = void 0;
const dashboard_service_1 = require("../../services/dashboard.service");
exports.dashboardController = {
    async index(_req, res) {
        const stats = await dashboard_service_1.dashboardService.getStats();
        res.render("admin/dashboard/index", {
            layout: "layouts/admin",
            title: "Dashboard",
            stats,
        });
    }
};
