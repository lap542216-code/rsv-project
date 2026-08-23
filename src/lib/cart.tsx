import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type CartLine = {
  food_item_id: string;
  name: string;
  price: number;
  qty: number;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  total: number;
  add: (line: Omit<CartLine, "qty">, qty: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "msv-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

function read(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    setLines(read());
  }, []);

  const persist = useCallback((next: CartLine[]) => {
    setLines(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const value = useMemo<CartContextValue>(() => {
    return {
      lines,
      count: lines.reduce((sum, l) => sum + l.qty, 0),
      total: lines.reduce((sum, l) => sum + l.qty * l.price, 0),
      add: (line, qty) => {
        const existing = lines.find((l) => l.food_item_id === line.food_item_id);
        persist(
          existing
            ? lines.map((l) =>
                l.food_item_id === line.food_item_id ? { ...l, qty: l.qty + qty, price: line.price } : l,
              )
            : [...lines, { ...line, qty }],
        );
      },
      setQty: (id, qty) =>
        persist(
          qty <= 0
            ? lines.filter((l) => l.food_item_id !== id)
            : lines.map((l) => (l.food_item_id === id ? { ...l, qty } : l)),
        ),
      remove: (id) => persist(lines.filter((l) => l.food_item_id !== id)),
      clear: () => persist([]),
    };
  }, [lines, persist]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
