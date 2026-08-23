import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

/** GET /api/menu — active FoodItems only */
router.get("/", async (_req, res) => {
  try {
    const items = await prisma.foodItem.findMany({
      where: { isActive: true, availableQuantity: { gt: 0 } },
      orderBy: { createdAt: "asc" },
    });
    res.json(items.map((i) => ({
      id: i.id,
      name: i.name,
      price: Number(i.price),
      available_quantity: i.availableQuantity,
      is_active: i.isActive,
      created_at: i.createdAt,
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load menu" });
  }
});

export default router;
