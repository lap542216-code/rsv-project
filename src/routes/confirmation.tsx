import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Download } from "lucide-react";
import { toast } from "sonner";

import { downloadReceipt } from "@/lib/receipt";

import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { BrandSeal } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { inr, type OrderItem } from "@/lib/msv";
import { LAST_ORDER_KEY } from "@/routes/checkout";

export const Route = createFileRoute("/confirmation")({
  head: () => ({
    meta: [
      { title: "Order Confirmed — MSV Catering" },
      { name: "description", content: "Your MSV Catering order has been placed successfully." },
      { property: "og:title", content: "Order Confirmed — MSV Catering" },
      {
        property: "og:description",
        content: "Your MSV Catering order has been placed successfully.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConfirmationPage,
});

type LastOrder = {
  order_number: string;
  total_amount: number;
  items: OrderItem[];
  student_name: string;
  department: string;
  phone_number: string;
  payment_method: "cod" | "online";
};

function ConfirmationPage() {
  const [order, setOrder] = useState<LastOrder | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDownload(current: LastOrder) {
    setBusy(true);
    try {
      await downloadReceipt(current);
    } catch {
      toast.error("Could not generate the receipt. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(LAST_ORDER_KEY);
      if (raw) setOrder(JSON.parse(raw) as LastOrder);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-12">
        {!ready ? null : !order ? (
          <Card className="surface-panel p-10 text-center">
            <h1 className="font-display text-2xl text-gilded">No recent order</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              We couldn't find a recent order in this browser. Use Track My Order with your order
              number and phone number.
            </p>
            <Button asChild variant="gold" className="mt-6">
              <Link to="/track">Track my order</Link>
            </Button>
          </Card>
        ) : (
          <Card className="surface-panel p-8 text-center">
            <BrandSeal className="mx-auto h-20 w-20" />
            <CheckCircle2 className="mx-auto mt-5 size-8 text-success" />
            <h1 className="mt-3 font-display text-3xl text-gilded">Order Confirmed</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Thank you, {order.student_name}. Your food is on the way to the counter.
            </p>

            <div className="mx-auto mt-6 w-fit rounded-lg border border-primary/40 bg-primary/10 px-6 py-3">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Order number</p>
              <p className="font-display text-3xl text-primary">{order.order_number}</p>
            </div>

            <div className="mt-8 space-y-2 text-left">
              {order.items.map((item) => (
                <div key={item.food_item_id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.name} × {item.qty}
                  </span>
                  <span>{inr(item.price * item.qty)}</span>
                </div>
              ))}
              <div className="rule-gold" />
              <div className="flex justify-between">
                <span className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Total</span>
                <span className="font-display text-xl text-gilded">{inr(order.total_amount)}</span>
              </div>
              <p className="pt-2 text-xs text-muted-foreground">
                {order.payment_method === "cod"
                  ? "Payment: Cash on Delivery — please pay at the counter."
                  : "Payment: Online — marked as paid."}
              </p>
              <p className="text-xs text-muted-foreground">
                Department: {order.department} · Phone: {order.phone_number}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button variant="gold" disabled={busy} onClick={() => handleDownload(order)}>
                <Download />
                {busy ? "Preparing receipt…" : "Download PDF receipt"}
              </Button>
              <Button asChild variant="goldOutline">
                <Link to="/track">Track / Cancel order</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/">Back to menu</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Save your order number — you'll need it along with your phone number to track this
              order.
            </p>
          </Card>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
