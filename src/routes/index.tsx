import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Minus, Plus, Clock, Lock, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { BrandSeal } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/lib/cart";
import { inr, menuQuery, prettyClock, shopStatusQuery, type FoodItem } from "@/lib/msv";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MSV Catering — Today's Menu & Online Ordering" },
      {
        name: "description",
        content:
          "Browse today's menu from MSV Catering and order in seconds. No account needed — pay by cash on delivery or online.",
      },
      { property: "og:title", content: "MSV Catering — Today's Menu" },
      {
        property: "og:description",
        content: "Deliciously Yours, Taste the Difference. Order today's meals from MSV Catering.",
      },
    ],
  }),
  component: StudentHome,
});

function StudentHome() {
  const status = useQuery(shopStatusQuery);
  const menu = useQuery({ ...menuQuery, enabled: status.data?.is_open === true });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <Hero
          isOpen={status.data?.is_open}
          openTime={status.data?.open_time}
          closeTime={status.data?.close_time}
        />

        {status.isLoading ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : status.data?.is_open ? (
          <section className="mt-12">
            <SectionTitle title="Today's Menu" subtitle="Freshly prepared, served hot" />
            {menu.isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-40 w-full" />
                ))}
              </div>
            ) : (menu.data ?? []).length === 0 ? (
              <EmptyMenu />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(menu.data ?? []).map((item) => (
                  <MenuCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <ClosedState
            openTime={status.data?.open_time}
            closeTime={status.data?.close_time}
            mode={status.data?.mode}
          />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-2xl text-gilded">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="rule-gold mt-4 w-full" />
    </div>
  );
}

function Hero({
  isOpen,
  openTime,
  closeTime,
}: {
  isOpen?: boolean | undefined;
  openTime?: string | undefined;
  closeTime?: string | undefined;
}) {
  return (
    <section className="surface-panel relative overflow-hidden rounded-2xl px-6 py-12 text-center sm:px-12">
      <BrandSeal className="mx-auto h-24 w-24" />
      <h1 className="mt-6 font-display text-4xl text-gilded sm:text-5xl">MSV Catering</h1>
      <p className="mt-3 text-sm uppercase tracking-[0.3em] text-muted-foreground">
        Deliciously Yours · Taste the Difference
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${
            isOpen
              ? "border-success/50 bg-success/10 text-success"
              : "border-destructive/50 bg-destructive/10 text-destructive"
          }`}
        >
          <span className="size-2 rounded-full bg-current" />
          {isOpen === undefined ? "Checking…" : isOpen ? "Shop Open" : "Shop Closed"}
        </span>
        {openTime && closeTime && (
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <Clock className="size-4" />
            Ordering hours {prettyClock(openTime)} – {prettyClock(closeTime)}
          </span>
        )}
      </div>
    </section>
  );
}

function ClosedState({
  openTime,
  closeTime,
  mode,
}: {
  openTime?: string | undefined;
  closeTime?: string | undefined;
  mode?: string | undefined;
}) {
  return (
    <Card className="surface-panel mt-12 border-destructive/30 p-10 text-center">
      <Lock className="mx-auto size-8 text-destructive" />
      <h2 className="mt-4 font-display text-2xl text-foreground">Shop Closed</h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
        {mode === "manual"
          ? "We're not taking orders right now. Please check back on the next serving day — the kitchen will be right here waiting for you."
          : `Ordering is open daily between ${prettyClock(openTime)} and ${prettyClock(closeTime)}. Come back within those hours to place your order.`}
      </p>
      <div className="mt-6">
        <Button asChild variant="goldOutline">
          <Link to="/track">Track an existing order</Link>
        </Button>
      </div>
    </Card>
  );
}

function EmptyMenu() {
  return (
    <Card className="surface-panel p-10 text-center">
      <UtensilsCrossed className="mx-auto size-8 text-primary" />
      <h3 className="mt-4 font-display text-xl">Menu coming up</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Today's dishes haven't been published yet. Please refresh in a little while.
      </p>
    </Card>
  );
}

function MenuCard({ item }: { item: FoodItem }) {
  const [qty, setQty] = useState(1);
  const { add } = useCart();
  const soldOut = item.available_quantity <= 0;
  const max = Math.max(1, Math.min(20, item.available_quantity));

  return (
    <Card className="surface-panel flex flex-col justify-between gap-4 p-5">
      <div>
        <h3 className="font-display text-xl text-foreground">{item.name}</h3>
        <p className="mt-1 text-2xl font-semibold text-primary">{inr(item.price)}</p>
        <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
          {soldOut ? "Sold out" : `${item.available_quantity} available`}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-md border border-border bg-input/40 p-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={`Decrease ${item.name}`}
            disabled={soldOut || qty <= 1}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            <Minus />
          </Button>
          <span className="w-8 text-center text-sm font-semibold">{qty}</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={`Increase ${item.name}`}
            disabled={soldOut || qty >= max}
            onClick={() => setQty((q) => Math.min(max, q + 1))}
          >
            <Plus />
          </Button>
        </div>
        <Button
          variant="gold"
          size="sm"
          disabled={soldOut}
          onClick={() => {
            add({ food_item_id: item.id, name: item.name, price: item.price }, qty);
            toast.success(`${item.name} × ${qty} added to cart`);
            setQty(1);
          }}
        >
          Add to Cart
        </Button>
      </div>
    </Card>
  );
}
