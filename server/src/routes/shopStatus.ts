import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

function getEffectiveStatus(settings: {
  isOpenOverride: boolean | null;
  openTime: string;
  closeTime: string;
}) {
  if (settings.isOpenOverride === true) return { is_open: true, mode: "manual" };
  if (settings.isOpenOverride === false) return { is_open: false, mode: "manual" };

  // Auto mode — check time window in IST
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  const h = ist.getUTCHours();
  const m = ist.getUTCMinutes();
  const nowMinutes = h * 60 + m;

  const [oh, om] = settings.openTime.split(":").map(Number);
  const [ch, cm] = settings.closeTime.split(":").map(Number);
  const openMinutes = (oh ?? 0) * 60 + (om ?? 0);
  const closeMinutes = (ch ?? 0) * 60 + (cm ?? 0);

  const is_open = nowMinutes >= openMinutes && nowMinutes < closeMinutes;
  return {
    is_open,
    mode: "auto",
    open_time: settings.openTime,
    close_time: settings.closeTime,
    server_time: ist.toISOString(),
  };
}

/** GET /api/shop-status */
router.get("/", async (_req, res) => {
  try {
    const settings = await prisma.shopSettings.findFirst({ orderBy: { createdAt: "asc" } });
    if (!settings) {
      return res.json({ is_open: false, mode: "manual", reason: "No settings configured" });
    }
    const status = getEffectiveStatus(settings);
    return res.json({
      ...status,
      cancellation_cutoff_minutes: settings.cancellationCutoffMinutes,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to get shop status" });
  }
});

export { getEffectiveStatus };
export default router;
