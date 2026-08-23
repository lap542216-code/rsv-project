import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { getEffectiveStatus } from "./shopStatus.js";

const router = Router();

const OrderItemSchema = z.object({
  food_item_id: z.string().min(1),
  qty: z.number().int().positive(),
});

const PlaceOrderSchema = z.object({
  student_name: z.string().trim().min(2).max(80),
  phone_number: z.string().trim().regex(/^[0-9]{10}$/),
  department: z.string().trim().min(1).max(80),
  items: z.array(OrderItemSchema).min(1),
  payment_method: z.enum(["cod", "online"]),
});

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

/** POST /api/orders — place a new order */
router.post("/", async (req, res) => {
  const parsed = PlaceOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }

  try {
    // Check shop is open
    const settings = await prisma.shopSettings.findFirst({ orderBy: { createdAt: "asc" } });
    if (!settings) return res.status(503).json({ error: "Shop not configured" });
    const status = getEffectiveStatus(settings);
    if (!status.is_open) return res.status(403).json({ error: "Shop is currently closed" });

    const { student_name, phone_number, department, items, payment_method } = parsed.data;

    // Validate each item, check price & quantity server-side
    const resolvedItems: {
      food_item_id: string;
      name: string;
      price: number;
      qty: number;
    }[] = [];
    let total = 0;

    for (const item of items) {
      const foodItem = await prisma.foodItem.findFirst({
        where: { id: item.food_item_id, isActive: true },
      });
      if (!foodItem) {
        return res.status(400).json({ error: `Item not available` });
      }
      if (foodItem.availableQuantity < item.qty) {
        return res
          .status(400)
          .json({ error: `Not enough ${foodItem.name} left (${foodItem.availableQuantity} available)` });
      }
      resolvedItems.push({
        food_item_id: item.food_item_id,
        name: foodItem.name,
        price: Number(foodItem.price),
        qty: item.qty,
      });
      total += Number(foodItem.price) * item.qty;
    }

    // Atomically decrement stock and create order in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Generate order number
      const counter = await tx.orderCounter.update({
        where: { id: 1 },
        data: { current: { increment: 1 } },
      });
      const orderNumber = `#${counter.current}`;

      // Decrement stock
      for (const item of resolvedItems) {
        await tx.foodItem.update({
          where: { id: item.food_item_id },
          data: { availableQuantity: { decrement: item.qty } },
        });
      }

      // Create order
      const order = await tx.order.create({
        data: {
          orderNumber,
          studentName: student_name,
          phoneNumber: phone_number,
          department,
          items: JSON.stringify(resolvedItems),
          totalAmount: total,
          paymentMethod: payment_method === "online" ? "ONLINE" : "COD",
          paymentStatus: "PENDING",
          orderStatus: "PLACED",
        },
      });

      return order;
    });

    return res.status(201).json({
      id: result.id,
      order_number: result.orderNumber,
      total_amount: Number(result.totalAmount),
      items: resolvedItems,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Could not place order" });
  }
});

/** GET /api/orders/lookup?phone=&orderNumber= */
router.get("/lookup", async (req, res) => {
  const phone = String(req.query["phone"] ?? "").trim();
  const orderNumber = String(req.query["orderNumber"] ?? "").trim();

  if (!phone || !orderNumber) {
    return res.status(400).json({ error: "phone and orderNumber are required" });
  }

  try {
    const order = await prisma.order.findFirst({
      where: { orderNumber, phoneNumber: phone },
    });
    if (!order) return res.json(null);

    const settings = await prisma.shopSettings.findFirst({ orderBy: { createdAt: "asc" } });
    const cutoffMs = (settings?.cancellationCutoffMinutes ?? 30) * 60 * 1000;
    const canCancel =
      order.orderStatus === "PLACED" &&
      Date.now() < new Date(order.createdAt).getTime() + cutoffMs;

    return res.json({
      id: order.id,
      order_number: order.orderNumber,
      student_name: order.studentName,
      department: order.department,
      items: parseItems(order.items),
      total_amount: Number(order.totalAmount),
      payment_method: order.paymentMethod.toLowerCase(),
      payment_status: order.paymentStatus.toLowerCase(),
      order_status: order.orderStatus.toLowerCase(),
      created_at: order.createdAt,
      preparing_at: order.preparingAt,
      delivered_at: order.deliveredAt,
      cancelled_at: order.cancelledAt,
      can_cancel: canCancel,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Lookup failed" });
  }
});

/** POST /api/orders/:id/cancel */
router.post("/:id/cancel", async (req, res) => {
  const { id } = req.params;
  const phone = String(req.body?.phone_number ?? "").trim();
  const orderNumber = String(req.body?.order_number ?? "").trim();

  try {
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id },
          ...(orderNumber ? [{ orderNumber }] : []),
        ],
        ...(phone ? { phoneNumber: phone } : {}),
      },
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.orderStatus !== "PLACED") {
      return res.status(400).json({ error: "This order can no longer be cancelled" });
    }

    const settings = await prisma.shopSettings.findFirst({ orderBy: { createdAt: "asc" } });
    const cutoffMs = (settings?.cancellationCutoffMinutes ?? 30) * 60 * 1000;
    if (Date.now() >= new Date(order.createdAt).getTime() + cutoffMs) {
      return res.status(400).json({ error: "Cancellation window has passed" });
    }

    await prisma.$transaction(async (tx) => {
      // Restore stock
      const items = parseItems(order.items);
      for (const item of items) {
        if (item.food_item_id && item.qty) {
          await tx.foodItem.update({
            where: { id: item.food_item_id },
            data: { availableQuantity: { increment: item.qty } },
          });
        }
      }
      await tx.order.update({
        where: { id: order.id },
        data: { orderStatus: "CANCELLED", cancelledAt: new Date() },
      });
    });

    return res.json({ order_number: order.orderNumber, order_status: "cancelled" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Cancel failed" });
  }
});

export default router;
