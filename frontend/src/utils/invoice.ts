import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { BRAND } from "@/src/config/brand";
import type { Address, OrderItem } from "@/src/types";
import { formatCurrency } from "@/src/utils/format";

export interface InvoiceOrder {
  id: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string | number | Date;
  address: Address;
  paymentMethod: "cod" | "online";
  estimatedDeliveryMinutes: number;
  couponCode?: string;
  couponDiscount?: number;
  deliveryDiscount?: number;
  deliveryDay?: "today" | "tomorrow";
  deliveryDateLabel?: string;
  deliverySlotId?: string;
  deliverySlotLabel?: string;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function getInvoiceNumber(
  orderId: string,
): string {
  return `INV-${orderId.replace(
    /[^a-zA-Z0-9]/g,
    "",
  )}`;
}

function getInvoiceDate(
  createdAt: string | number | Date,
): string {
  return new Date(createdAt).toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function getProductDiscount(
  items: OrderItem[],
): number {
  return items.reduce((total, item) => {
    const saving = Math.max(
      0,
      item.mrp - item.price,
    );

    return total + saving * item.quantity;
  }, 0);
}

export function buildInvoiceHtml(
  order: InvoiceOrder,
): string {
  const invoiceNumber = getInvoiceNumber(
    order.id,
  );

  const couponDiscount =
    order.couponDiscount ?? 0;

  const deliveryDiscount =
    order.deliveryDiscount ?? 0;

  const productDiscount =
    getProductDiscount(order.items);

  const itemMrp = order.items.reduce(
    (total, item) =>
      total + item.mrp * item.quantity,
    0,
  );

  const totalSavings =
    productDiscount +
    couponDiscount +
    deliveryDiscount;

  const deliveryText =
    order.deliverySlotLabel
      ? `${order.deliveryDateLabel ?? ""} · ${
          order.deliverySlotLabel
        }`
      : `Within ${order.estimatedDeliveryMinutes} minutes`;

  const itemRows = order.items
    .map(
      (item) => `
        <tr>
          <td>
            <div class="item-name">${escapeHtml(
              item.name,
            )}</div>
            <div class="muted">${escapeHtml(
              item.size,
            )} × ${item.quantity}</div>
          </td>
          <td class="right">${escapeHtml(
            formatCurrency(item.price),
          )}</td>
          <td class="right">${item.quantity}</td>
          <td class="right strong">${escapeHtml(
            formatCurrency(
              item.price * item.quantity,
            ),
          )}</td>
        </tr>
      `,
    )
    .join("");

  const addressText = [
    order.address.house,
    order.address.area,
    order.address.landmark
      ? `Near ${order.address.landmark}`
      : "",
    order.address.pincode,
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join(", ");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  />
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 28px;
      color: #17201b;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      line-height: 1.45;
      background: #ffffff;
    }

    .invoice {
      max-width: 760px;
      margin: 0 auto;
      border: 1px solid #dfe7e1;
      border-radius: 14px;
      overflow: hidden;
    }

    .header {
      padding: 26px;
      color: #ffffff;
      background: #16a34a;
    }

    .header-grid {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
    }

    .store-name {
      margin: 0;
      font-size: 25px;
      font-weight: 800;
    }

    .invoice-title {
      margin-top: 5px;
      opacity: 0.9;
      font-size: 12px;
      letter-spacing: 1.3px;
      text-transform: uppercase;
    }

    .header-meta {
      text-align: right;
    }

    .header-meta strong {
      display: block;
      margin-bottom: 3px;
      font-size: 15px;
    }

    .content {
      padding: 24px;
    }

    .two-column {
      display: flex;
      gap: 18px;
      margin-bottom: 22px;
    }

    .info-card {
      flex: 1;
      padding: 15px;
      border: 1px solid #e3e9e5;
      border-radius: 10px;
      background: #f8fbf9;
    }

    .section-label {
      margin-bottom: 7px;
      color: #64706a;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }

    .strong {
      font-weight: 700;
    }

    .muted {
      margin-top: 2px;
      color: #68736d;
      font-size: 10px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      padding: 10px 8px;
      color: #55615b;
      font-size: 10px;
      text-align: left;
      text-transform: uppercase;
      background: #eef7f1;
      border-bottom: 1px solid #dfe7e1;
    }

    td {
      padding: 12px 8px;
      vertical-align: top;
      border-bottom: 1px solid #edf1ee;
    }

    .item-name {
      font-weight: 700;
    }

    .right {
      text-align: right;
    }

    .summary {
      width: 340px;
      margin-top: 20px;
      margin-left: auto;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      padding: 5px 0;
    }

    .discount {
      color: #15803d;
    }

    .total {
      margin-top: 8px;
      padding-top: 12px;
      border-top: 2px solid #17201b;
      font-size: 16px;
      font-weight: 800;
    }

    .savings {
      margin-top: 15px;
      padding: 10px 12px;
      color: #166534;
      font-weight: 700;
      border-radius: 8px;
      background: #dcfce7;
    }

    .footer {
      margin-top: 25px;
      padding-top: 16px;
      color: #6b756f;
      font-size: 10px;
      text-align: center;
      border-top: 1px solid #e5ebe7;
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="header-grid">
        <div>
          <h1 class="store-name">${escapeHtml(
            BRAND.name,
          )}</h1>
          <div class="invoice-title">
            Customer Invoice
          </div>
        </div>

        <div class="header-meta">
          <strong>${escapeHtml(
            invoiceNumber,
          )}</strong>
          <div>Order: ${escapeHtml(
            order.id,
          )}</div>
          <div>${escapeHtml(
            getInvoiceDate(order.createdAt),
          )}</div>
        </div>
      </div>
    </div>

    <div class="content">
      <div class="two-column">
        <div class="info-card">
          <div class="section-label">
            Bill To
          </div>
          <div class="strong">${escapeHtml(
            order.address.fullName,
          )}</div>
          <div>${addressText}</div>
          <div>Mobile: +91 ${escapeHtml(
            order.address.mobile,
          )}</div>
        </div>

        <div class="info-card">
          <div class="section-label">
            Order Information
          </div>
          <div>
            Payment:
            <span class="strong">
              ${
                order.paymentMethod === "cod"
                  ? "Cash on Delivery"
                  : "Online Payment"
              }
            </span>
          </div>
          <div>
            Delivery:
            <span class="strong">${escapeHtml(
              deliveryText,
            )}</span>
          </div>
          ${
            order.couponCode
              ? `<div>Coupon: <span class="strong">${escapeHtml(
                  order.couponCode,
                )}</span></div>`
              : ""
          }
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th class="right">Rate</th>
            <th class="right">Qty</th>
            <th class="right">Amount</th>
          </tr>
        </thead>

        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <div class="summary">
        <div class="summary-row">
          <span>Item MRP</span>
          <span>${escapeHtml(
            formatCurrency(itemMrp),
          )}</span>
        </div>

        ${
          productDiscount > 0
            ? `
              <div class="summary-row discount">
                <span>Product Discount</span>
                <span>-${escapeHtml(
                  formatCurrency(
                    productDiscount,
                  ),
                )}</span>
              </div>
            `
            : ""
        }

        <div class="summary-row">
          <span>Item Total</span>
          <span>${escapeHtml(
            formatCurrency(order.subtotal),
          )}</span>
        </div>

        ${
          couponDiscount > 0
            ? `
              <div class="summary-row discount">
                <span>Coupon Discount</span>
                <span>-${escapeHtml(
                  formatCurrency(
                    couponDiscount,
                  ),
                )}</span>
              </div>
            `
            : ""
        }

        ${
          deliveryDiscount > 0
            ? `
              <div class="summary-row discount">
                <span>Delivery Discount</span>
                <span>-${escapeHtml(
                  formatCurrency(
                    deliveryDiscount,
                  ),
                )}</span>
              </div>
            `
            : ""
        }

        <div class="summary-row">
          <span>Delivery Fee</span>
          <span>${
            order.deliveryFee === 0
              ? "FREE"
              : escapeHtml(
                  formatCurrency(
                    order.deliveryFee,
                  ),
                )
          }</span>
        </div>

        <div class="summary-row total">
          <span>Grand Total</span>
          <span>${escapeHtml(
            formatCurrency(order.total),
          )}</span>
        </div>

        ${
          totalSavings > 0
            ? `
              <div class="savings">
                Total savings: ${escapeHtml(
                  formatCurrency(totalSavings),
                )}
              </div>
            `
            : ""
        }
      </div>

      <div class="footer">
        Thank you for shopping with ${escapeHtml(
          BRAND.name,
        )}. This is a computer-generated customer
        invoice.
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

export async function createInvoicePdf(
  order: InvoiceOrder,
): Promise<string> {
  const result = await Print.printToFileAsync({
    html: buildInvoiceHtml(order),
    base64: false,
  });

  return result.uri;
}

export async function shareInvoicePdf(
  order: InvoiceOrder,
): Promise<string> {
  const uri = await createInvoicePdf(order);
  const sharingAvailable =
    await Sharing.isAvailableAsync();

  if (!sharingAvailable) {
    throw new Error(
      "File sharing is unavailable on this device.",
    );
  }

  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: `${BRAND.name} Invoice`,
    UTI: "com.adobe.pdf",
  });

  return uri;
}

export async function printInvoice(
  order: InvoiceOrder,
): Promise<void> {
  await Print.printAsync({
    html: buildInvoiceHtml(order),
  });
}