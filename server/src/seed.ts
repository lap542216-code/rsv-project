import "dotenv/config";
import { prisma } from "./db.js";
import argon2 from "argon2";

async function seed() {
  console.log("🌱 Starting database seed...");

  const email = process.env.OWNER_EMAIL ?? "owner@msvcatering.in";
  const password = process.env.OWNER_PASSWORD ?? "ChangeMe#2026!";

  // 1. Owner User
  const existingOwner = await prisma.ownerUser.findUnique({ where: { email } });
  if (!existingOwner) {
    const passwordHash = await argon2.hash(password);
    const owner = await prisma.ownerUser.create({
      data: { email, passwordHash },
    });
    console.log(`✅ Created owner user: ${owner.email}`);
  } else {
    console.log(`ℹ️ Owner user already exists: ${email}`);
  }

  // 2. Shop Settings (Open)
  const existingSettings = await prisma.shopSettings.findFirst({ orderBy: { createdAt: "asc" } });
  if (!existingSettings) {
    await prisma.shopSettings.create({
      data: {
        isOpenOverride: true,
        openTime: "08:00",
        closeTime: "22:00",
        cancellationCutoffMinutes: 30,
        resetCutoffTime: "23:30",
      },
    });
    console.log("✅ Created shop settings (Shop OPEN).");
  } else {
    await prisma.shopSettings.update({
      where: { id: existingSettings.id },
      data: { isOpenOverride: true },
    });
    console.log("✅ Updated shop settings (Shop OPEN).");
  }

  // 3. Order Counter
  const existingCounter = await prisma.orderCounter.findUnique({ where: { id: 1 } });
  if (!existingCounter) {
    await prisma.orderCounter.create({ data: { id: 1, current: 1045 } });
    console.log("✅ Created order counter at #1045.");
  }

  // 4. Food Items (5 items: active, inactive, zero-quantity)
  const foodItemsData = [
    { name: "Veg Meals", price: 60, availableQuantity: 50, isActive: true },
    { name: "Chicken Biryani", price: 120, availableQuantity: 40, isActive: true },
    { name: "Curd Rice", price: 40, availableQuantity: 30, isActive: true },
    { name: "White Sauce Pasta", price: 90, availableQuantity: 0, isActive: true }, // zero-quantity
    { name: "Fresh Fruit Salad", price: 50, availableQuantity: 25, isActive: false }, // inactive
  ];

  const createdItems = [];
  for (const item of foodItemsData) {
    const existing = await prisma.foodItem.findFirst({ where: { name: item.name } });
    if (!existing) {
      const created = await prisma.foodItem.create({ data: item });
      createdItems.push(created);
      console.log(`✅ Created item: ${item.name} (${item.availableQuantity} qty, active: ${item.isActive})`);
    } else {
      const updated = await prisma.foodItem.update({
        where: { id: existing.id },
        data: { price: item.price, availableQuantity: item.availableQuantity, isActive: item.isActive },
      });
      createdItems.push(updated);
      console.log(`ℹ️ Updated item: ${item.name}`);
    }
  }

  // 5. Pre-existing Orders (PLACED, DELIVERED, CANCELLED)
  const orderCount = await prisma.order.count();
  if (orderCount === 0) {
    const vegMeals = createdItems.find((i) => i.name === "Veg Meals") ?? createdItems[0];
    const biryani = createdItems.find((i) => i.name === "Chicken Biryani") ?? createdItems[1];

    // Order 1: PLACED (COD)
    await prisma.order.create({
      data: {
        orderNumber: "#1040",
        studentName: "Rahul Sharma",
        phoneNumber: "9876543210",
        department: "B.Tech CSE - III Year",
        items: JSON.stringify([
          { food_item_id: biryani.id, name: biryani.name, qty: 1, price: Number(biryani.price) },
        ]),
        totalAmount: Number(biryani.price),
        paymentMethod: "COD",
        paymentStatus: "PENDING",
        orderStatus: "PLACED",
      },
    });

    // Order 2: DELIVERED (Online)
    await prisma.order.create({
      data: {
        orderNumber: "#1041",
        studentName: "Priya Patel",
        phoneNumber: "9123456780",
        department: "B.Sc Maths - II Year",
        items: JSON.stringify([
          { food_item_id: vegMeals.id, name: vegMeals.name, qty: 2, price: Number(vegMeals.price) },
        ]),
        totalAmount: Number(vegMeals.price) * 2,
        paymentMethod: "ONLINE",
        paymentStatus: "PAID",
        orderStatus: "DELIVERED",
        deliveredAt: new Date(),
      },
    });

    // Order 3: CANCELLED (COD)
    await prisma.order.create({
      data: {
        orderNumber: "#1042",
        studentName: "Anand Kumar",
        phoneNumber: "9845123456",
        department: "MBA - I Year",
        items: JSON.stringify([
          { food_item_id: vegMeals.id, name: vegMeals.name, qty: 1, price: Number(vegMeals.price) },
        ]),
        totalAmount: Number(vegMeals.price),
        paymentMethod: "COD",
        paymentStatus: "PENDING",
        orderStatus: "CANCELLED",
        cancelledAt: new Date(),
      },
    });

    console.log("✅ Created sample orders (#1040 PLACED, #1041 DELIVERED, #1042 CANCELLED).");
  } else {
    console.log(`ℹ️ Orders already exist (${orderCount} orders).`);
  }

  console.log("🎉 Seeding complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
