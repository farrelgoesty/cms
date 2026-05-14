import type { Request, Response } from "express";
import { dashboardService } from "../../services/dashboard.service";

export const dashboardController = {
  async index(_req: Request, res: Response) {
    const stats = await dashboardService.getStats();

    res.render("admin/dashboard/index", {
      layout: "layouts/admin",
      title: "Dashboard",
      stats,
    });
  }
};
