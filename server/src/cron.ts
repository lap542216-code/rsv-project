import cron from "node-cron";
import { prisma } from "./db.js";

export function startCronJobs() {
  // Run daily archive at 11:30 PM IST (18:00 UTC)
  cron.schedule("0 18 * * *", async () => {
    console.log("[cron] Running daily order archive...");
    try {
      const orders = await prisma.order.findMany();
      if (orders.length === 0) {
        console.log("[cron] No orders to archive.");
        return;
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
      console.log(`[cron] Archived ${orders.length} order(s).`);
    } catch (e) {
      console.error("[cron] Archive failed:", e);
    }
  });

  console.log("[cron] Daily archive job scheduled.");
}
