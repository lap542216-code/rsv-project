import { apiFetch } from "@/lib/api";

export type FoodItem = {
  id: string;
  name: string;
  price: number;
  available_quantity: number;
  is_active: boolean;
  created_at: string;
};

export type OrderItem = {
  food_item_id: string;
  name: string;
  qty: number;
  price: number;
};

export type Order = {
  id: string;
  order_number: string;
  student_name: string;
  phone_number: string;
  department: string;
  items: OrderItem[];
  total_amount: number;
  payment_method: "cod" | "online";
  payment_status: "pending" | "paid";
  order_status: "placed" | "preparing" | "delivered" | "cancelled";
  created_at: string;
  preparing_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
};

export type ShopStatus = {
  is_open: boolean;
  mode?: "auto" | "manual";
  open_time?: string;
  close_time?: string;
  cancellation_cutoff_minutes?: number;
  server_time?: string;
  reason?: string;
};

export type TrackedOrder = Omit<Order, "id" | "phone_number"> & { can_cancel: boolean };

export const inr = (amount: number) =>
  `₹${Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const formatTime = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

export const prettyClock = (t?: string) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${m ?? "00"} ${suffix}`;
};

export const shopStatusQuery = {
  queryKey: ["shop-status"] as const,
  queryFn: (): Promise<ShopStatus> => apiFetch("/api/shop-status"),
  refetchInterval: 60_000,
  staleTime: 30_000,
  retry: 1,
};

export const menuQuery = {
  queryKey: ["menu"] as const,
  queryFn: (): Promise<FoodItem[]> => apiFetch("/api/menu"),
  staleTime: 30_000,
  retry: 1,
};

/** Placeholder for the payment gateway. Real Cashfree integration comes later. */
export async function initiateOnlinePayment(amount: number): Promise<{ ok: boolean }> {
  console.info("[initiateOnlinePayment] placeholder invoked for amount", amount);
  await new Promise((r) => setTimeout(r, 400));
  return { ok: true };
}

export async function placeOrder(input: {
  student_name: string;
  phone_number: string;
  department: string;
  items: { food_item_id: string; qty: number }[];
  payment_method: "cod" | "online";
}) {
  return apiFetch<{ order_number: string; total_amount: number; items: OrderItem[] }>(
    "/api/orders",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
}

export async function trackOrder(orderNumber: string, phone: string) {
  const params = new URLSearchParams({ phone, orderNumber });
  const result = await apiFetch<TrackedOrder | null>(`/api/orders/lookup?${params}`);
  return result ?? null;
}

export async function cancelOrder(orderNumber: string, phone: string, orderId: string) {
  await apiFetch(`/api/orders/${orderId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ order_number: orderNumber, phone_number: phone }),
  });
}

export function normalizeOrderNumber(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("#") ? trimmed : `#${trimmed.replace(/^#*/, "")}`;
}
