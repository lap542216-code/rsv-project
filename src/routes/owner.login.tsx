import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

import { BrandSeal } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/owner/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Owner Login — MSV Catering" },
      { name: "description", content: "Secure login for the MSV Catering shop owner." },
      { property: "og:title", content: "Owner Login — MSV Catering" },
      { property: "og:description", content: "Secure login for the MSV Catering shop owner." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OwnerLogin,
});

function OwnerLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn() {
    if (!email.trim() || password.length < 6) {
      toast.error("Enter your email and a password of at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/owner/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      toast.success("Welcome back");
      navigate({ to: "/owner/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="surface-panel w-full max-w-sm p-8">
        <BrandSeal className="mx-auto h-16 w-16" />
        <h1 className="mt-5 text-center font-display text-2xl text-gilded">Shop Owner</h1>
        <p className="mt-1 text-center text-xs uppercase tracking-[0.22em] text-muted-foreground">
          MSV Catering Admin
        </p>
        <div className="rule-gold mx-auto mt-5 w-24" />

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@msvcatering.in"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && signIn()}
            />
          </div>
          <Button variant="gold" className="w-full" disabled={loading} onClick={signIn}>
            {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
            Sign in
          </Button>
        </div>
      </Card>
    </div>
  );
}
