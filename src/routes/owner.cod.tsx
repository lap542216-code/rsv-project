import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

import { OwnerShell } from "@/components/OwnerShell";
import { StatusBadge } from "@/routes/owner.dashboard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatTime, inr } from "@/lib/msv";
import { isToday, ordersQuery, requireOwner, updateOrderStatus } from "@/lib/owner";

export const Route = createFileRoute("/owner/cod")({
  ssr: false,
  beforeLoad: () => requireOwner(),
  head: () => ({
    meta: [
      { title: "COD Pending — MSV Catering Admin" },
      { name: "description", content: "Cash-on-delivery orders awaiting handover." },
      { property: "og:title", content: "COD Pending — MSV Catering Admin" },
      { property: "og:description", content: "Cash-on-delivery orders awaiting handover." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CodPending,
});

function CodPending() {
  const { data: orders = [], isLoading } = useQuery(ordersQuery);
  const queryClient = useQueryClient();

  const deliver = useMutation({
    mutationFn: (id: string) => updateOrderStatus(id, "delivered"),
    onSuccess: () => {
      toast.success("Marked as delivered");
      queryClient.invalidateQueries({ queryKey: ["owner", "orders"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const pending = orders.filter(
    (o) =>
      o.payment_method === "cod" &&
      o.order_status !== "delivered" &&
      o.order_status !== "cancelled" &&
      isToday(o.created_at),
  );

  const due = pending.reduce((sum, o) => sum + Number(o.total_amount), 0);

  return (
    <OwnerShell>
      <h1 className="font-display text-3xl text-gilded">COD Pending</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {pending.length} order{pending.length === 1 ? "" : "s"} · {inr(due)} to collect
      </p>
      <div className="rule-gold mt-4 w-full" />

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : pending.length === 0 ? (
        <Card className="surface-panel mt-8 p-10 text-center">
          <CheckCircle2 className="mx-auto size-8 text-success" />
          <p className="mt-3 text-sm text-muted-foreground">All cash orders are delivered.</p>
        </Card>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {pending.map((order) => (
            <Card key={order.id} className="surface-panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-2xl text-primary">{order.order_number}</p>
                  <p className="text-sm">{order.student_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.phone_number} · {order.department} · {formatTime(order.created_at)}
                  </p>
                </div>
                <StatusBadge status={order.order_status} />
              </div>

              <div className="mt-4 space-y-1">
                {(order.items ?? []).map((item) => (
                  <div key={item.food_item_id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.name} × {item.qty}
                    </span>
                    <span>{inr(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>

              <div className="rule-gold my-4" />
              <div className="flex items-center justify-between">
                <span className="font-display text-xl text-gilded">{inr(order.total_amount)}</span>
                <Button
                  variant="gold"
                  size="sm"
                  disabled={deliver.isPending}
                  onClick={() => deliver.mutate(order.id)}
                >
                  <CheckCircle2 />
                  Mark as Delivered
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </OwnerShell>
  );
}
