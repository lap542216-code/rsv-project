import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Archive, Save } from "lucide-react";

import { OwnerShell } from "@/components/OwnerShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { prettyClock, shopStatusQuery } from "@/lib/msv";
import { requireOwner, shopSettingsQuery, type ShopSettings } from "@/lib/owner";

export const Route = createFileRoute("/owner/settings")({
  ssr: false,
  beforeLoad: () => requireOwner(),
  head: () => ({
    meta: [
      { title: "Shop Status — MSV Catering Admin" },
      { name: "description", content: "Control opening hours, shop status and daily reset." },
      { property: "og:title", content: "Shop Status — MSV Catering Admin" },
      { property: "og:description", content: "Control opening hours, shop status and daily reset." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

type Mode = "auto" | "open" | "closed";

function modeOf(value: boolean | null): Mode {
  if (value === null) return "auto";
  return value ? "open" : "closed";
}

function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery(shopSettingsQuery);
  const { data: status } = useQuery(shopStatusQuery);
  const [form, setForm] = useState<ShopSettings | null>(null);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["owner", "shop-settings"] });
    queryClient.invalidateQueries({ queryKey: ["shop-status"] });
  };

  const save = useMutation({
    mutationFn: async (next: ShopSettings) => {
      await apiFetch("/api/owner/shop-status", {
        method: "PATCH",
        body: JSON.stringify({
          is_open_override: next.is_open_override,
          open_time: next.open_time,
          close_time: next.close_time,
          cancellation_cutoff_minutes: next.cancellation_cutoff_minutes,
          reset_cutoff_time: next.reset_cutoff_time,
        }),
      });
    },
    onSuccess: () => {
      toast.success("Shop settings saved");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reset = useMutation({
    mutationFn: async () => {
      return apiFetch<{ archived?: number; skipped?: boolean }>("/api/owner/archive", {
        method: "POST",
      });
    },
    onSuccess: (result) => {
      toast.success(
        result?.skipped
          ? "Nothing archived yet — the daily cutoff time hasn't passed."
          : `Archived ${result?.archived ?? 0} order(s)`,
      );
      queryClient.invalidateQueries({ queryKey: ["owner", "orders"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!form) {
    return (
      <OwnerShell>
        <p className="text-sm text-muted-foreground">Loading settings…</p>
      </OwnerShell>
    );
  }

  const mode = modeOf(form.is_open_override);

  return (
    <OwnerShell>
      <h1 className="font-display text-3xl text-gilded">Shop Status</h1>
      <div className="rule-gold mt-4 w-full" />

      <Card className="surface-panel mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Effective status right now
            </p>
            <p
              className={`mt-1 font-display text-2xl ${
                status?.is_open ? "text-success" : "text-destructive"
              }`}
            >
              {status?.is_open ? "Open for orders" : "Closed"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Schedule: {prettyClock(form.open_time)} – {prettyClock(form.close_time)}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {(["auto", "open", "closed"] as Mode[]).map((option) => (
            <Button
              key={option}
              variant={mode === option ? "gold" : "goldOutline"}
              size="sm"
              onClick={() =>
                setForm({
                  ...form,
                  is_open_override: option === "auto" ? null : option === "open",
                })
              }
            >
              {option === "auto" ? "Auto (schedule)" : option === "open" ? "Force Open" : "Force Closed"}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Auto follows the opening hours below. Force Open / Force Closed overrides the schedule
          until you switch back to Auto.
        </p>
      </Card>

      <Card className="surface-panel mt-6 grid gap-4 p-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="open_time">Opening time</Label>
          <Input
            id="open_time"
            type="time"
            value={form.open_time?.slice(0, 5) ?? ""}
            onChange={(e) => setForm({ ...form, open_time: `${e.target.value}:00` })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="close_time">Closing time</Label>
          <Input
            id="close_time"
            type="time"
            value={form.close_time?.slice(0, 5) ?? ""}
            onChange={(e) => setForm({ ...form, close_time: `${e.target.value}:00` })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cutoff">Cancellation window (minutes)</Label>
          <Input
            id="cutoff"
            inputMode="numeric"
            value={String(form.cancellation_cutoff_minutes)}
            onChange={(e) =>
              setForm({
                ...form,
                cancellation_cutoff_minutes: Number(e.target.value.replace(/\D/g, "")) || 0,
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reset_time">Daily archive cutoff time</Label>
          <Input
            id="reset_time"
            type="time"
            value={form.reset_cutoff_time?.slice(0, 5) ?? ""}
            onChange={(e) => setForm({ ...form, reset_cutoff_time: `${e.target.value}:00` })}
          />
        </div>
        <div className="sm:col-span-2">
          <Button variant="gold" disabled={save.isPending} onClick={() => save.mutate(form)}>
            <Save />
            Save settings
          </Button>
        </div>
      </Card>

      <Card className="surface-panel mt-6 p-5">
        <h2 className="font-display text-xl">Daily reset</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Orders are archived automatically each day at the cutoff time above. Nothing is ever hard
          deleted — everything moves into the archive.
        </p>
        <Button
          variant="goldOutline"
          className="mt-4"
          disabled={reset.isPending}
          onClick={() => reset.mutate()}
        >
          <Archive />
          Archive today's orders now
        </Button>
      </Card>
    </OwnerShell>
  );
}
