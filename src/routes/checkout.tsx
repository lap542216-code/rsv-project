import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Banknote, CreditCard, Loader2 } from "lucide-react";

import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/lib/cart";
import { inr, initiateOnlinePayment, placeOrder, shopStatusQuery } from "@/lib/msv";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — MSV Catering" },
      {
        name: "description",
        content: "Enter your details and choose cash on delivery or online payment.",
      },
      { property: "og:title", content: "Checkout — MSV Catering" },
      {
        property: "og:description",
        content: "Enter your details and choose cash on delivery or online payment.",
      },
    ],
  }),
  component: CheckoutPage,
});

const schema = z.object({
  student_name: z.string().trim().min(2, "Enter your full name").max(80),
  phone_number: z.string().trim().regex(/^[0-9]{10}$/, "Enter a valid 10-digit phone number"),
  department: z.string().trim().min(1, "Enter your department or class").max(80),
});

export const LAST_ORDER_KEY = "msv-last-order";

function CheckoutPage() {
  const { lines, total, clear } = useCart();
  const navigate = useNavigate();
  const status = useQuery(shopStatusQuery);
  const [form, setForm] = useState({ student_name: "", phone_number: "", department: "" });
  const [method, setMethod] = useState<"cod" | "online">("cod");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const closed = status.data?.is_open === false;

  async function submit() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      if (method === "online") {
        const payment = await initiateOnlinePayment(total);
        if (!payment.ok) throw new Error("Payment could not be started. Please try again.");
      }
      const result = await placeOrder({
        ...parsed.data,
        payment_method: method,
        items: lines.map((l) => ({ food_item_id: l.food_item_id, qty: l.qty })),
      });
      window.sessionStorage.setItem(
        LAST_ORDER_KEY,
        JSON.stringify({
          ...result,
          student_name: parsed.data.student_name,
          department: parsed.data.department,
          phone_number: parsed.data.phone_number,
          payment_method: method,
        }),
      );
      clear();
      navigate({ to: "/confirmation" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not place your order");
    } finally {
      setSubmitting(false);
    }
  }

  if (lines.length === 0) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="font-display text-2xl text-gilded">Nothing to check out</h1>
          <p className="mt-3 text-sm text-muted-foreground">Add a few dishes to your cart first.</p>
          <Button asChild variant="gold" className="mt-6">
            <Link to="/">Back to menu</Link>
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-3xl text-gilded">Checkout</h1>
        <div className="rule-gold mt-4 w-full" />

        {closed && (
          <Card className="surface-panel mt-6 border-destructive/40 p-4 text-sm text-destructive">
            The shop just closed — orders can't be placed right now.
          </Card>
        )}

        <Card className="surface-panel mt-8 space-y-5 p-6">
          <div className="space-y-2">
            <Label htmlFor="student_name">Student name</Label>
            <Input
              id="student_name"
              maxLength={80}
              value={form.student_name}
              onChange={(e) => setForm({ ...form, student_name: e.target.value })}
              placeholder="e.g. Nidhiesh Kumar"
            />
            {errors["student_name"] && (
              <p className="text-xs text-destructive">{errors["student_name"]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone number</Label>
            <Input
              id="phone_number"
              inputMode="numeric"
              maxLength={10}
              value={form.phone_number}
              onChange={(e) =>
                setForm({ ...form, phone_number: e.target.value.replace(/\D/g, "").slice(0, 10) })
              }
              placeholder="10-digit mobile number"
            />
            {errors["phone_number"] && (
              <p className="text-xs text-destructive">{errors["phone_number"]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department / Class</Label>
            <Input
              id="department"
              maxLength={80}
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              placeholder="e.g. B.Sc CS — III Year"
            />
            {errors["department"] && <p className="text-xs text-destructive">{errors["department"]}</p>}
          </div>

          <div className="space-y-2">
            <Label>Payment method</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <PaymentOption
                active={method === "cod"}
                onClick={() => setMethod("cod")}
                icon={<Banknote className="size-5" />}
                title="Cash on Delivery"
                caption="Pay when you collect"
              />
              <PaymentOption
                active={method === "online"}
                onClick={() => setMethod("online")}
                icon={<CreditCard className="size-5" />}
                title="Online Payment"
                caption="UPI / cards (coming soon)"
              />
            </div>
          </div>
        </Card>

        <Card className="surface-panel mt-6 space-y-3 p-5">
          {lines.map((l) => (
            <div key={l.food_item_id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {l.name} × {l.qty}
              </span>
              <span>{inr(l.qty * l.price)}</span>
            </div>
          ))}
          <div className="rule-gold" />
          <div className="flex items-center justify-between">
            <span className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Total</span>
            <span className="font-display text-2xl text-gilded">{inr(total)}</span>
          </div>
        </Card>

        <Button
          variant="gold"
          size="lg"
          className="mt-6 w-full"
          disabled={submitting || closed}
          onClick={submit}
        >
          {submitting && <Loader2 className="animate-spin" />}
          {method === "online" ? `Pay ${inr(total)} & Place Order` : `Place Order · ${inr(total)}`}
        </Button>
      </main>
      <SiteFooter />
    </div>
  );
}

function PaymentOption({
  active,
  onClick,
  icon,
  title,
  caption,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  caption: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-input/30 text-muted-foreground hover:border-primary/50"
      }`}
    >
      <span className={active ? "text-primary" : ""}>{icon}</span>
      <span>
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{caption}</span>
      </span>
    </button>
  );
}
