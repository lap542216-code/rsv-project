import { redirect } from "@tanstack/react-router";

import { apiFetch } from "@/lib/api";
import type { FoodItem, Order } from "@/lib/msv";

/** Client-side gate for owner routes — checks session cookie via /api/owner/me. */
export async function requireOwner() {
  try {
    const data = await apiFetch<{ email: string }>("/api/owner/me");
    return { user: data };
  } catch {
    throw redirect({ to: "/owner/login" });
  }
}

export const ordersQuery = {
  queryKey: ["owner", "orders"] as const,
  queryFn: (): Promise<Order[]> => apiFetch("/api/owner/orders"),
  refetchInterval: 20_000,
};

export const allFoodItemsQuery = {
  queryKey: ["owner", "food-items"] as const,
  queryFn: (): Promise<FoodItem[]> => apiFetch("/api/owner/menu"),
};

export type ShopSettings = {
  id: string;
  is_open_override: boolean | null;
  open_time: string;
  close_time: string;
  cancellation_cutoff_minutes: number;
  reset_cutoff_time: string;
};

export const shopSettingsQuery = {
  queryKey: ["owner", "shop-settings"] as const,
  queryFn: (): Promise<ShopSettings> => apiFetch("/api/owner/shop-settings"),
};

export async function updateOrderStatus(id: string, status: Order["order_status"]) {
  await apiFetch(`/api/owner/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function markDelivered(id: string) {
  await apiFetch(`/api/owner/orders/${id}/deliver`, { method: "PATCH" });
}

export function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export function foodSummary(orders: Order[]) {
  const map = new Map<string, { name: string; qty: number; amount: number }>();
  for (const order of orders) {
    if (order.order_status === "cancelled") continue;
    for (const item of order.items ?? []) {
      const entry = map.get(item.food_item_id) ?? { name: item.name, qty: 0, amount: 0 };
      entry.qty += item.qty;
      entry.amount += item.qty * item.price;
      map.set(item.food_item_id, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.qty - a.qty);
}
