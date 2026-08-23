import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { OwnerShell } from "@/components/OwnerShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatTime, inr, type Order } from "@/lib/msv";
import { foodSummary, isToday, ordersQuery, requireOwner, updateOrderStatus } from "@/lib/owner";

export const Route = createFileRoute("/owner/dashboard")({
  ssr: false,
  beforeLoad: () => requireOwner(),
  head: () => ({
    meta: [
      { title: "Dashboard — MSV Catering Admin" },
      { name: "description", content: "Today's orders and food summary for MSV Catering." },
      { property: "og:title", content: "Dashboard — MSV Catering Admin" },
      { property: "og:description", content: "Today's orders and food summary for MSV Catering." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

type Filter = "all" | "cod" | "online";

function Dashboard() {
  const { data: orders = [], isLoading } = useQuery(ordersQuery);
  const [filter, setFilter] = useState<Filter>("all");
  const queryClient = useQueryClient();

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Order["order_status"] }) =>
      updateOrderStatus(id, status),
    onSuccess: (_data, vars) => {
      toast.success(vars.status === "preparing" ? "Marked as preparing" : "Marked as delivered");
      queryClient.invalidateQueries({ queryKey: ["owner", "orders"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const today = orders.filter((o) => isToday(o.created_at));
  const visible = today.filter((o) => filter === "all" || o.payment_method === filter);
  const summary = foodSummary(today);
  const revenue = today
    .filter((o) => o.order_status !== "cancelled")
    .reduce((sum, o) => sum + Number(o.total_amount), 0);

  return (
    <OwnerShell>
      <h1 className="font-display text-3xl text-gilded">Today's Orders</h1>
      <div className="rule-gold mt-4 w-full" />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Orders today" value={String(today.length)} />
        <Stat label="Revenue" value={inr(revenue)} />
        <Stat
          label="Pending delivery"
          value={String(today.filter((o) => o.order_status === "placed" || o.order_status === "preparing").length)}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="surface-panel overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-4">
            <h2 className="font-display text-xl">Orders</h2>
            <div className="flex gap-1 rounded-md border border-border bg-input/30 p-1">
              {(["all", "online", "cod"] as Filter[]).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "gold" : "ghost"}
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "All" : f === "cod" ? "COD" : "Online"}
                </Button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-input/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Times</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={8}>
                      Loading orders…
                    </td>
                  </tr>
                )}
                {!isLoading && visible.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={8}>
                      No orders yet today.
                    </td>
                  </tr>
                )}
                {visible.map((order) => (
                  <tr key={order.id} className="border-t border-border/50 align-top">
                    <td className="px-4 py-3 font-semibold text-primary">{order.order_number}</td>
                    <td className="px-4 py-3">
                      <span className="block">{order.student_name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {order.phone_number} · {order.department}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {(order.items ?? []).map((i) => `${i.name} ×${i.qty}`).join(", ")}
                    </td>
                    <td className="px-4 py-3">{inr(order.total_amount)}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="block uppercase">{order.payment_method}</span>
                      <span
                        className={
                          order.payment_status === "paid" ? "text-success" : "text-muted-foreground"
                        }
                      >
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.order_status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <span className="block">Placed {formatTime(order.created_at)}</span>
                      {order.preparing_at && (
                        <span className="block">Preparing {formatTime(order.preparing_at)}</span>
                      )}
                      {order.delivered_at && (
                        <span className="block text-success">
                          Delivered {formatTime(order.delivered_at)}
                        </span>
                      )}
                      {order.cancelled_at && (
                        <span className="block text-destructive">
                          Cancelled {formatTime(order.cancelled_at)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {order.order_status === "placed" && (
                          <Button
                            size="sm"
                            variant="goldOutline"
                            disabled={advance.isPending}
                            onClick={() => advance.mutate({ id: order.id, status: "preparing" })}
                          >
                            Start preparing
                          </Button>
                        )}
                        {(order.order_status === "placed" ||
                          order.order_status === "preparing") && (
                          <Button
                            size="sm"
                            variant="gold"
                            disabled={advance.isPending}
                            onClick={() => advance.mutate({ id: order.id, status: "delivered" })}
                          >
                            Mark delivered
                          </Button>
                        )}
                        {(order.order_status === "delivered" ||
                          order.order_status === "cancelled") && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="surface-panel h-fit p-5">
          <h2 className="font-display text-xl">Food Summary</h2>
          <p className="text-xs text-muted-foreground">Total quantity ordered today</p>
          <div className="rule-gold my-4" />
          {summary.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing ordered yet.</p>
          ) : (
            <ul className="space-y-3">
              {summary.map((row) => (
                <li key={row.name} className="flex items-center justify-between text-sm">
                  <span>{row.name}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-semibold text-primary">×{row.qty}</span>
                    <span className="text-xs text-muted-foreground">{inr(row.amount)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </OwnerShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="surface-panel p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl text-gilded">{value}</p>
    </Card>
  );
}

export function StatusBadge({ status }: { status: Order["order_status"] }) {
  const cls =
    status === "cancelled"
      ? "border-destructive/50 bg-destructive/10 text-destructive"
      : status === "delivered"
        ? "border-success/50 bg-success/10 text-success"
        : "border-primary/50 bg-primary/10 text-primary";
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-wider ${cls}`}>
      {status}
    </span>
  );
}
