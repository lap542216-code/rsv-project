import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Home } from "lucide-react";

import { BrandSeal } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

const links = [
  { to: "/owner/dashboard", label: "Dashboard" },
  { to: "/owner/cod", label: "COD Pending" },
  { to: "/owner/menu", label: "Menu" },
  { to: "/owner/settings", label: "Shop Status" },
] as const;

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    try {
      await apiFetch("/api/owner/logout", { method: "POST" });
    } catch (e) {
      console.error(e);
    }
    navigate({ to: "/owner/login", replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/owner/dashboard" className="flex items-center gap-3">
            <BrandSeal className="h-10 w-10" />
            <span className="font-display text-lg tracking-wide text-gilded">MSV Admin</span>
          </Link>
          <nav className="flex flex-1 flex-wrap items-center gap-1">
            {links.map((link) => (
              <Button key={link.to} asChild variant="ghost" size="sm">
                <Link to={link.to} activeProps={{ className: "text-primary" }}>
                  {link.label}
                </Link>
              </Button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <Home className="size-4" />
                <span className="hidden sm:inline">Store Home</span>
              </Link>
            </Button>
            <Button variant="goldOutline" size="sm" onClick={signOut}>
              <LogOut />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
