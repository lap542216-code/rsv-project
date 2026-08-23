import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Save, Trash2 } from "lucide-react";

import { OwnerShell } from "@/components/OwnerShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api";
import { type FoodItem } from "@/lib/msv";
import { allFoodItemsQuery, requireOwner } from "@/lib/owner";

export const Route = createFileRoute("/owner/menu")({
  ssr: false,
  beforeLoad: () => requireOwner(),
  head: () => ({
    meta: [
      { title: "Menu Management — MSV Catering Admin" },
      { name: "description", content: "Add, edit and remove today's MSV Catering menu items." },
      { property: "og:title", content: "Menu Management — MSV Catering Admin" },
      {
        property: "og:description",
        content: "Add, edit and remove today's MSV Catering menu items.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MenuManagement,
});

function MenuManagement() {
  const queryClient = useQueryClient();
  const { data: items = [], isLoading } = useQuery(allFoodItemsQuery);
  const [draft, setDraft] = useState({ name: "", price: "", qty: "" });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["owner", "food-items"] });
    queryClient.invalidateQueries({ queryKey: ["menu"] });
  };

  const add = useMutation({
    mutationFn: async () => {
      const price = Number(draft.price);
      const qty = Number(draft.qty);
      if (draft.name.trim().length < 2) throw new Error("Enter a dish name");
      if (!Number.isFinite(price) || price <= 0) throw new Error("Enter a valid price");
      if (!Number.isInteger(qty) || qty < 0) throw new Error("Enter a valid quantity");
      await apiFetch("/api/owner/menu", {
        method: "POST",
        body: JSON.stringify({
          name: draft.name.trim(),
          price,
          available_quantity: qty,
        }),
      });
    },
    onSuccess: () => {
      toast.success("Item added");
      setDraft({ name: "", price: "", qty: "" });
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const save = useMutation({
    mutationFn: async (item: FoodItem) => {
      await apiFetch(`/api/owner/menu/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: item.name,
          price: item.price,
          available_quantity: item.available_quantity,
          is_active: item.is_active,
        }),
      });
    },
    onSuccess: () => {
      toast.success("Item updated");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/owner/menu/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast.success("Item deleted");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <OwnerShell>
      <h1 className="font-display text-3xl text-gilded">Menu Management</h1>
      <div className="rule-gold mt-4 w-full" />

      <Card className="surface-panel mt-6 p-5">
        <h2 className="font-display text-xl">Add an item</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="name">Dish name</Label>
            <Input
              id="name"
              value={draft.name}
              maxLength={80}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Chicken Biryani"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price (₹)</Label>
            <Input
              id="price"
              inputMode="decimal"
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: e.target.value })}
              placeholder="120"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qty">Available qty</Label>
            <Input
              id="qty"
              inputMode="numeric"
              value={draft.qty}
              onChange={(e) => setDraft({ ...draft, qty: e.target.value.replace(/\D/g, "") })}
              placeholder="40"
            />
          </div>
          <div className="flex items-end">
            <Button variant="gold" disabled={add.isPending} onClick={() => add.mutate()}>
              <Plus />
              Add
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-8 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading menu…</p>}
        {!isLoading && items.length === 0 && (
          <Card className="surface-panel p-8 text-center text-sm text-muted-foreground">
            No menu items yet — add today's dishes above.
          </Card>
        )}
        {items.map((item) => (
          <MenuRow
            key={item.id}
            item={item}
            saving={save.isPending}
            onSave={(next) => save.mutate(next)}
            onDelete={() => remove.mutate(item.id)}
          />
        ))}
      </div>
    </OwnerShell>
  );
}

function MenuRow({
  item,
  saving,
  onSave,
  onDelete,
}: {
  item: FoodItem;
  saving: boolean;
  onSave: (item: FoodItem) => void;
  onDelete: () => void;
}) {
  const [local, setLocal] = useState(item);
  const dirty =
    local.name !== item.name ||
    Number(local.price) !== Number(item.price) ||
    Number(local.available_quantity) !== Number(item.available_quantity) ||
    local.is_active !== item.is_active;

  return (
    <Card className="surface-panel grid gap-4 p-4 sm:grid-cols-[2fr_1fr_1fr_auto_auto] sm:items-center">
      <Input value={local.name} onChange={(e) => setLocal({ ...local, name: e.target.value })} />
      <Input
        inputMode="decimal"
        value={String(local.price)}
        onChange={(e) => setLocal({ ...local, price: Number(e.target.value) || 0 })}
      />
      <Input
        inputMode="numeric"
        value={String(local.available_quantity)}
        onChange={(e) =>
          setLocal({ ...local, available_quantity: Number(e.target.value.replace(/\D/g, "")) || 0 })
        }
      />
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <Switch
          checked={local.is_active}
          onCheckedChange={(checked) => setLocal({ ...local, is_active: checked })}
        />
        {local.is_active ? "Live" : "Hidden"}
      </label>
      <div className="flex gap-2">
        <Button
          variant="gold"
          size="sm"
          disabled={!dirty || saving}
          onClick={() => onSave(local)}
          aria-label="Save item"
        >
          <Save />
          Save
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label={`Delete ${item.name}`}>
          <Trash2 className="text-destructive" />
        </Button>
      </div>
    </Card>
  );
}
