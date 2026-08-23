import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCart } from "@/lib/cart";
import { inr } from "@/lib/msv";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — MSV Catering" },
      { name: "description", content: "Review your MSV Catering order before checkout." },
      { property: "og:title", content: "Your Cart — MSV Catering" },
      { property: "og:description", content: "Review your MSV Catering order before checkout." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { lines, total, setQty, remove, clear } = useCart();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-3xl text-gilded">Your Cart</h1>
        <div className="rule-gold mt-4 w-full" />

        {lines.length === 0 ? (
          <Card className="surface-panel mt-8 p-10 text-center">
            <ShoppingBag className="mx-auto size-8 text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Your cart is empty.</p>
            <Button asChild variant="gold" className="mt-6">
              <Link to="/">Browse today's menu</Link>
            </Button>
          </Card>
        ) : (
          <>
            <div className="mt-8 space-y-3">
              {lines.map((line) => (
                <Card
                  key={line.food_item_id}
                  className="surface-panel flex flex-wrap items-center justify-between gap-4 p-4"
                >
                  <div>
                    <p className="font-display text-lg">{line.name}</p>
                    <p className="text-sm text-muted-foreground">{inr(line.price)} each</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 rounded-md border border-border bg-input/40 p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label="Decrease quantity"
                        onClick={() => setQty(line.food_item_id, line.qty - 1)}
                      >
                        <Minus />
                      </Button>
                      <span className="w-8 text-center text-sm font-semibold">{line.qty}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label="Increase quantity"
                        onClick={() => setQty(line.food_item_id, Math.min(50, line.qty + 1))}
                      >
                        <Plus />
                      </Button>
                    </div>
                    <p className="w-20 text-right font-semibold text-primary">
                      {inr(line.qty * line.price)}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${line.name}`}
                      onClick={() => remove(line.food_item_id)}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="surface-panel mt-6 flex items-center justify-between p-5">
              <span className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Total</span>
              <span className="font-display text-2xl text-gilded">{inr(total)}</span>
            </Card>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="gold" size="lg" onClick={() => navigate({ to: "/checkout" })}>
                Proceed to Checkout
              </Button>
              <Button variant="ghost" onClick={clear}>
                Clear cart
              </Button>
              <Button asChild variant="ghost">
                <Link to="/">Add more items</Link>
              </Button>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
