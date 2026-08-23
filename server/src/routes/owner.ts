import { Router } from "express";
import argon2 from "argon2";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../db.js";
import {
  clearSessionCookie,
  requireOwnerAuth,
  setSessionCookie,
  type OwnerPayload,
} from "../auth.js";

const router = Router();

function parseItems(raw: unknown) {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return Array.isArray(raw) ? raw : [];
}

// ---------- Public auth routes ----------

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: "Too many login attempts. Please wait 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** POST /api/owner/login */
router.post("/login", loginLimiter, async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid email or password" });
  }
  const { email, password } = parsed.data;

  try {
    const owner = await prisma.ownerUser.findUnique({ where: { email } });
    if (!owner) {
      // Constant-time dummy to prevent user-enumeration timing attacks
      await argon2.hash("dummy");
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const valid = await argon2.verify(owner.passwordHash, password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    setSessionCookie(res, { ownerId: owner.id, email: owner.email });
    return res.json({ ok: true, email: owner.email });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Login failed" });
  }
});

/** POST /api/owner/logout */
router.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

/** GET /api/owner/me — check current session */
router.get("/me", requireOwnerAuth, (req, res) => {
  const owner = (req as typeof req & { owner: OwnerPayload }).owner;
  res.json({ email: owner.email });
});

// ---------- Protected owner routes ----------

router.use(requireOwnerAuth);

/** GET /api/owner/orders — today's orders with optional filter */
router.get("/orders", async (req, res) => {
  try {
    const method = req.query["method"] as string | undefined;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfDay },
        ...(method === "cod"
          ? { paymentMethod: "COD" }
          : method === "online"
            ? { paymentMethod: "ONLINE" }
            : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(
      orders.map((o) => ({
        id: o.id,
        order_number: o.orderNumber,
        student_name: o.studentName,
        phone_number: o.phoneNumber,
        department: o.department,
        items: parseItems(o.items),
        total_amount: Number(o.totalAmount),
        payment_method: o.paymentMethod.toLowerCase(),
        payment_status: o.paymentStatus.toLowerCase(),
        order_status: o.orderStatus.toLowerCase(),
        created_at: o.createdAt,
        preparing_at: o.preparingAt,
        delivered_at: o.deliveredAt,
        cancelled_at: o.cancelledAt,
      }))
    );
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to load orders" });
  }
});

/** GET /api/owner/orders/summary — quantity-per-item aggregation */
router.get("/orders/summary", async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfDay },
        orderStatus: { not: "CANCELLED" },
      },
    });

    const map = new Map<string, { name: string; qty: number; amount: number }>();
    for (const order of orders) {
      const items = parseItems(order.items);
      for (const item of items) {
        if (item.food_item_id && item.name) {
          const entry = map.get(item.food_item_id) ?? { name: item.name, qty: 0, amount: 0 };
          entry.qty += item.qty;
          entry.amount += item.qty * item.price;
          map.set(item.food_item_id, entry);
        }
      }
    }

    return res.json([...map.values()].sort((a, b) => b.qty - a.qty));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to generate summary" });
  }
});

/** PATCH /api/owner/orders/:id/deliver */
router.patch("/orders/:id/deliver", async (req, res) => {
  const { id } = req.params;
  try {
    const order = await prisma.order.update({
      where: { id },
      data: {
        orderStatus: "DELIVERED",
        deliveredAt: new Date(),
        paymentStatus: "PAID",
      },
    });
    return res.json({ ok: true, order_number: order.orderNumber });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to mark delivered" });
  }
});

/** PATCH /api/owner/orders/:id/status */
router.patch("/orders/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status: string };
  try {
    const patch: Record<string, unknown> = {};
    if (status === "preparing") patch["preparingAt"] = new Date();
    if (status === "delivered") { patch["deliveredAt"] = new Date(); patch["paymentStatus"] = "PAID"; }
    if (status === "cancelled") patch["cancelledAt"] = new Date();
    const order = await prisma.order.update({
      where: { id },
      data: { orderStatus: status.toUpperCase() as "PLACED" | "PREPARING" | "DELIVERED" | "CANCELLED", ...patch },
    });
    return res.json({ ok: true, order_number: order.orderNumber });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to update status" });
  }
});

/** POST /api/owner/menu — add item */
router.post("/menu", async (req, res) => {
  const { name, price, available_quantity } = req.body;
  try {
    const item = await prisma.foodItem.create({
      data: { name, price: Number(price), availableQuantity: Number(available_quantity) || 0, isActive: true },
    });
    return res.status(201).json({
      id: item.id, name: item.name, price: Number(item.price),
      available_quantity: item.availableQuantity, is_active: item.isActive,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to add item" });
  }
});

/** PATCH /api/owner/menu/:id — update item */
router.patch("/menu/:id", async (req, res) => {
  const { id } = req.params;
  const { name, price, available_quantity, is_active } = req.body;
  try {
    const item = await prisma.foodItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price: Number(price) }),
        ...(available_quantity !== undefined && { availableQuantity: Number(available_quantity) }),
        ...(is_active !== undefined && { isActive: is_active }),
      },
    });
    return res.json({
      id: item.id, name: item.name, price: Number(item.price),
      available_quantity: item.availableQuantity, is_active: item.isActive,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to update item" });
  }
});

/** DELETE /api/owner/menu/:id — delete item */
router.delete("/menu/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.foodItem.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to delete item" });
  }
});

/** GET /api/owner/menu — all food items (including inactive) */
router.get("/menu", async (_req, res) => {
  try {
    const items = await prisma.foodItem.findMany({ orderBy: { createdAt: "asc" } });
    return res.json(items.map((i) => ({
      id: i.id, name: i.name, price: Number(i.price),
      available_quantity: i.availableQuantity, is_active: i.isActive, created_at: i.createdAt,
    })));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to load menu" });
  }
});

/** GET /api/owner/shop-settings */
router.get("/shop-settings", async (_req, res) => {
  try {
    const settings = await prisma.shopSettings.findFirst({ orderBy: { createdAt: "asc" } });
    if (!settings) return res.status(404).json({ error: "No settings found" });
    return res.json({
      id: settings.id,
      is_open_override: settings.isOpenOverride,
      open_time: settings.openTime,
      close_time: settings.closeTime,
      cancellation_cutoff_minutes: settings.cancellationCutoffMinutes,
      reset_cutoff_time: settings.resetCutoffTime,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to load settings" });
  }
});

/** PATCH /api/owner/shop-status — set override */
router.patch("/shop-status", async (req, res) => {
  const { is_open_override, open_time, close_time, cancellation_cutoff_minutes, reset_cutoff_time } = req.body;
  try {
    const existing = await prisma.shopSettings.findFirst({ orderBy: { createdAt: "asc" } });
    const settings = existing
      ? await prisma.shopSettings.update({
          where: { id: existing.id },
          data: {
            ...(is_open_override !== undefined && { isOpenOverride: is_open_override }),
            ...(open_time && { openTime: open_time }),
            ...(close_time && { closeTime: close_time }),
            ...(cancellation_cutoff_minutes !== undefined && {
              cancellationCutoffMinutes: cancellation_cutoff_minutes,
            }),
            ...(reset_cutoff_time && { resetCutoffTime: reset_cutoff_time }),
          },
        })
      : await prisma.shopSettings.create({
          data: {
            isOpenOverride: is_open_override ?? null,
            openTime: open_time ?? "08:00",
            closeTime: close_time ?? "22:00",
            cancellationCutoffMinutes: cancellation_cutoff_minutes ?? 30,
            resetCutoffTime: reset_cutoff_time ?? "23:30",
          },
        });
    return res.json({
      id: settings.id,
      is_open_override: settings.isOpenOverride,
      open_time: settings.openTime,
      close_time: settings.closeTime,
      cancellation_cutoff_minutes: settings.cancellationCutoffMinutes,
      reset_cutoff_time: settings.resetCutoffTime,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to update shop status" });
  }
});

/** POST /api/owner/archive — manually trigger daily archive */
router.post("/archive", async (_req, res) => {
  try {
    const orders = await prisma.order.findMany();
    if (orders.length === 0) {
      return res.json({ archived: 0, skipped: true });
    }
    await prisma.$transaction(async (tx) => {
      for (const o of orders) {
        await tx.archivedOrder.create({
          data: {
            id: o.id,
            orderNumber: o.orderNumber,
            studentName: o.studentName,
            phoneNumber: o.phoneNumber,
            department: o.department,
            items: o.items,
            totalAmount: o.totalAmount,
            paymentMethod: o.paymentMethod,
            paymentStatus: o.paymentStatus,
            orderStatus: o.orderStatus,
            createdAt: o.createdAt,
            preparingAt: o.preparingAt,
            deliveredAt: o.deliveredAt,
            cancelledAt: o.cancelledAt,
          },
        });
      }
      await tx.order.deleteMany();
    });
    return res.json({ archived: orders.length });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Archive failed" });
  }
});

export default router;
