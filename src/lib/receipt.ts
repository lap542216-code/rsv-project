import { jsPDF } from "jspdf";

import logoUrl from "@/assets/msv-logo-320.jpg";
import { inr, type OrderItem } from "@/lib/msv";

export type ReceiptOrder = {
  order_number: string;
  total_amount: number;
  items: OrderItem[];
  student_name: string;
  department: string;
  phone_number: string;
  payment_method: "cod" | "online";
  created_at?: string;
};

async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch(logoUrl);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("logo read failed"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const GOLD: [number, number, number] = [198, 160, 74];
const INK: [number, number, number] = [26, 24, 20];
const MUTED: [number, number, number] = [110, 105, 95];

/** Builds and downloads a branded PDF receipt for an order. */
export async function downloadReceipt(order: ReceiptOrder) {
  const doc = new jsPDF({ unit: "pt", format: "a5" });
  const width = doc.internal.pageSize.getWidth();
  const logo = await loadLogo();

  // Header band
  doc.setFillColor(INK[0], INK[1], INK[2]);
  doc.rect(0, 0, width, 118, "F");
  if (logo) doc.addImage(logo, "JPEG", width / 2 - 32, 12, 64, 64);
  doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.text("MSV CATERING", width / 2, 94, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Deliciously Yours — Taste the Difference", width / 2, 108, { align: "center" });

  let y = 148;
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.setFont("times", "bold");
  doc.setFontSize(15);
  doc.text("Order Receipt", 40, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.text(order.order_number, width - 40, y, { align: "right" });

  y += 10;
  doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setLineWidth(1);
  doc.line(40, y, width - 40, y);

  const dated = new Date(order.created_at ?? Date.now());
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  const meta = [
    `Name: ${order.student_name}`,
    `Phone: ${order.phone_number}`,
    `Department: ${order.department}`,
    `Date: ${dated.toLocaleString("en-IN")}`,
    `Payment: ${order.payment_method === "cod" ? "Cash on Delivery (pending)" : "Online (paid)"}`,
  ];
  for (const line of meta) {
    doc.text(line, 40, y);
    y += 14;
  }

  // Items table
  y += 10;
  doc.setFillColor(245, 241, 232);
  doc.rect(40, y - 12, width - 80, 20, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text("Item", 48, y + 2);
  doc.text("Qty", width - 150, y + 2, { align: "right" });
  doc.text("Amount", width - 48, y + 2, { align: "right" });
  y += 26;

  doc.setFont("helvetica", "normal");
  for (const item of order.items) {
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(String(item.name).slice(0, 34), 48, y);
    doc.text(String(item.qty), width - 150, y, { align: "right" });
    doc.text(inr(item.price * item.qty).replace("₹", "Rs. "), width - 48, y, { align: "right" });
    y += 18;
  }

  y += 4;
  doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.line(40, y, width - 40, y);
  y += 22;
  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.text("Total", 48, y);
  doc.text(inr(order.total_amount).replace("₹", "Rs. "), width - 48, y, { align: "right" });

  y += 34;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(
    "Keep this receipt. Your order number and phone number are needed to track or cancel.",
    40,
    y,
    { maxWidth: width - 80 },
  );

  doc.save(`MSV-Catering-${order.order_number.replace("#", "")}.pdf`);
}
