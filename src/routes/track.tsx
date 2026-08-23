import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, PackageSearch } from "lucide-react";

import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cancelOrder,
  formatTime,
  inr,
  normalizeOrderNumber,
  trackOrder,
  type TrackedOrder,
} from "@/lib/msv";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track My Order — MSV Catering" },
      {
        name: "description",
        content:
          "Enter your order number and phone number to check the status of your MSV Catering order or cancel it.",
      },
      { property: "og:title", content: "Track My Order — MSV Catering" },
      {
        property: "og:description",
        content: "Check your MSV Catering order status with your order number and phone number.",
      },
    ],
  }),
  component: TrackPage,
});

const statusLabels: Record<string, string> = {
  placed: "Placed",
  preparing: "Preparing",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function TrackPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [searched, setSearched] = useState(false);

  async function lookup() {
    if (!orderNumber.trim() || !/^[0-9]{10}$/.test(phone.trim())) {
      toast.error("Enter both your order number and 10-digit phone number");
      return;
    }
    setLoading(true);
    try {
      const result = await trackOrder(normalizeOrderNumber(orderNumber), phone.trim());
      setOrder(result);
      setSearched(true);
      if (!result) toast.error("No order matches that order number and phone number");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  async function doCancel() {
    setLoading(true);
    try {
      await cancelOrder(normalizeOrderNumber(orderNumber), phone.trim());
      toast.success("Order cancelled");
      const refreshed = await trackOrder(normalizeOrderNumber(orderNumber), phone.trim());
      setOrder(refreshed);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel this order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-3xl text-gilded">Track My Order</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          For your privacy, both your order number and phone number are required.
        </p>
        <div className="rule-gold mt-4 w-full" />

        <Card className="surface-panel mt-8 space-y-4 p-6">
          <div className="space-y-2">
            <Label htmlFor="order_number">Order number</Label>
            <Input
              id="order_number"
              value={orderNumber}
              maxLength={12}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="#1042"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit mobile number"
            />
          </div>
          <Button variant="gold" className="w-full" disabled={loading} onClick={lookup}>
            {loading ? <Loader2 className="animate-spin" /> : <PackageSearch />}
            Find my order
          </Button>
        </Card>

        {searched && !order && (
          <Card className="surface-panel mt-6 p-6 text-center text-sm text-muted-foreground">
            No order found for those details.
          </Card>
        )}

        {order && (
          <Card className="surface-panel mt-6 space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-2xl text-primary">{order.order_number}</p>
                <p className="text-xs text-muted-foreground">
                  Placed at {formatTime(order.created_at)} · {order.student_name} · {order.department}
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs uppercase tracking-widest ${
                  order.order_status === "cancelled"
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : order.order_status === "delivered"
                      ? "border-success/50 bg-success/10 text-success"
                      : "border-primary/50 bg-primary/10 text-primary"
                }`}
              >
                {statusLabels[order.order_status] ?? order.order_status}
              </span>
            </div>

            <div className="space-y-1">
              {order.items.map((item) => (
                <div key={item.food_item_id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.name} × {item.qty}
                  </span>
                  <span>{inr(item.price * item.qty)}</span>
                </div>
              ))}
            </div>

            <div className="rule-gold" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {order.payment_method === "cod" ? "Cash on Delivery" : "Online"} ·{" "}
                {order.payment_status === "paid" ? "Paid" : "Payment pending"}
              </span>
              <span className="font-display text-xl text-gilded">{inr(order.total_amount)}</span>
            </div>

            {order.delivered_at && (
              <p className="text-xs text-success">Delivered at {formatTime(order.delivered_at)}</p>
            )}

            {order.can_cancel ? (
              <Button variant="destructive" className="w-full" disabled={loading} onClick={doCancel}>
                Cancel this order
              </Button>
            ) : (
              order.order_status === "placed" && (
                <p className="text-xs text-muted-foreground">
                  The cancellation window for this order has passed.
                </p>
              )
            )}
          </Card>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
