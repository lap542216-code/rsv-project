import { Link } from "@tanstack/react-router";
import { ShoppingBag, Search, Home } from "lucide-react";

import { BrandSeal } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";

export function SiteHeader() {
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex items-center gap-3">
          <BrandSeal className="h-11 w-11" />
          <span className="leading-none">
            <span className="block font-display text-lg tracking-wide text-gilded">MSV Catering</span>
            <span className="hidden text-[11px] uppercase tracking-[0.22em] text-muted-foreground sm:block">
              Deliciously Yours
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/" activeProps={{ className: "text-primary bg-accent/50" }} activeOptions={{ exact: true }}>
              <Home />
              <span>Home</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/track" activeProps={{ className: "text-primary bg-accent/50" }}>
              <Search />
              <span className="hidden sm:inline">Track Order</span>
            </Link>
          </Button>
          <Button asChild variant="goldOutline" size="sm">
            <Link to="/cart">
              <ShoppingBag />
              Cart
              {count > 0 && (
                <span className="ml-1 rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                  {count}
                </span>
              )}
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border/60 py-8 text-center">
      <div className="rule-gold mx-auto mb-6 w-40" />
      <p className="font-display text-sm tracking-wide text-primary">
        Professional &amp; Exquisite · Taste the Difference
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        MSV Catering ·{" "}
        <Link to="/owner/login" className="underline underline-offset-4 hover:text-primary">
          Shop owner login
        </Link>
      </p>
    </footer>
  );
}
