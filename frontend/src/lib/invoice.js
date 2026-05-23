/**
 * Escape HTML special characters to prevent XSS in print templates.
 */
function escapeHtml(value) {
    if (value == null) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Render an HTML document in a new window via iframe.srcdoc (safer than document.write).
 * srcdoc takes a string but creates a sandboxed document context.
 */
function openPrintWindow(html) {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    const iframe = w.document.createElement("iframe");
    iframe.style.cssText = "position:fixed;inset:0;width:100%;height:100%;border:0";
    iframe.srcdoc = html;
    w.document.body.style.margin = "0";
    w.document.body.appendChild(iframe);
    iframe.onload = () => {
        try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        } catch (err) {
            console.error("Print failed:", err);
        }
    };
}

const PAYMENT_LABELS = { cash: "كاش", card: "بطاقة", installment: "تقسيط" };

/**
 * Print an invoice via the browser's print dialog.
 * All user-supplied values are HTML-escaped to prevent XSS.
 */
export function printInvoice(sale, shopName = "متجر الموبايلات") {
    const items = sale.items
        .map(
            (i) => `
        <tr>
            <td>${escapeHtml(i.name)}${i.imei ? ` <small>(IMEI: ${escapeHtml(i.imei)})</small>` : ""}</td>
            <td>${escapeHtml(i.quantity)}</td>
            <td>${Number(i.unit_price).toFixed(2)}</td>
            <td>${Number(i.total).toFixed(2)}</td>
        </tr>`
        )
        .join("");

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<title>فاتورة ${escapeHtml(sale.invoice_number)}</title>
<style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
    body { font-family: 'Cairo', sans-serif; padding: 24px; color: #0f172a; max-width: 720px; margin: 0 auto; }
    h1 { text-align: center; margin: 0 0 8px; }
    .meta { display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 2px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; }
    .totals { margin-top: 16px; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
    .totals .row { display: flex; justify-content: space-between; width: 320px; }
    .totals .row.total { font-size: 18px; font-weight: 700; border-top: 2px solid #0f172a; padding-top: 8px; margin-top: 8px; }
    .footer { text-align: center; margin-top: 32px; color: #64748b; font-size: 14px; }
</style>
</head>
<body>
    <h1>${escapeHtml(shopName)}</h1>
    <div class="meta">
        <div>
            <div><strong>رقم الفاتورة:</strong> ${escapeHtml(sale.invoice_number)}</div>
            <div><strong>التاريخ:</strong> ${escapeHtml(new Date(sale.created_at).toLocaleString("ar-EG"))}</div>
            <div><strong>الكاشير:</strong> ${escapeHtml(sale.cashier_name)}</div>
        </div>
        <div>
            <div><strong>العميل:</strong> ${escapeHtml(sale.customer_name || "زبون نقدي")}</div>
            ${sale.customer_phone ? `<div><strong>الهاتف:</strong> ${escapeHtml(sale.customer_phone)}</div>` : ""}
            <div><strong>الدفع:</strong> ${escapeHtml(PAYMENT_LABELS[sale.payment_method] || sale.payment_method)}</div>
        </div>
    </div>
    <table>
        <thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr></thead>
        <tbody>${items}</tbody>
    </table>
    <div class="totals">
        <div class="row"><span>الإجمالي:</span><span>${Number(sale.subtotal).toFixed(2)}</span></div>
        <div class="row"><span>الخصم:</span><span>${Number(sale.discount).toFixed(2)}</span></div>
        <div class="row total"><span>الإجمالي النهائي:</span><span>${Number(sale.total).toFixed(2)}</span></div>
        <div class="row"><span>المدفوع:</span><span>${Number(sale.paid_amount).toFixed(2)}</span></div>
    </div>
    <div class="footer">شكراً لتسوقكم معنا</div>
</body>
</html>`;

    openPrintWindow(html);
}

/** Open WhatsApp with a pre-filled message containing invoice text */
export function sendInvoiceViaWhatsApp(sale, phone) {
    const targetPhone = (phone || sale.customer_phone || "").replace(/[^0-9]/g, "");
    if (!targetPhone) {
        alert("لا يوجد رقم واتساب لإرسال الفاتورة");
        return;
    }
    const lines = sale.items
        .map((i) => `• ${i.name} × ${i.quantity} = ${Number(i.total).toFixed(2)}`)
        .join("%0A");
    const msg = `*فاتورة رقم ${sale.invoice_number}*%0A%0A${lines}%0A%0A*الإجمالي: ${Number(sale.total).toFixed(2)}*%0Aشكراً لتسوقكم 🌟`;
    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(msg).replace(/%2520/g, "%20")}`, "_blank");
}

/** Print a repair receipt */
export function printRepairTicket(repair, shopName = "متجر الموبايلات") {
    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<title>تذكرة صيانة ${escapeHtml(repair.ticket_number)}</title>
<style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
    body { font-family: 'Cairo', sans-serif; padding: 24px; color: #0f172a; max-width: 720px; margin: 0 auto; }
    h1 { text-align: center; margin: 0 0 8px; }
    h2 { color: #2563eb; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .row strong { color: #64748b; }
    .ticket { background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; display: inline-block; font-size: 22px; }
    .footer { text-align: center; margin-top: 32px; color: #64748b; font-size: 14px; }
</style>
</head>
<body>
    <h1>${escapeHtml(shopName)}</h1>
    <div style="text-align:center; margin: 16px 0;">
        <div class="ticket">رقم التذكرة: ${escapeHtml(repair.ticket_number)}</div>
    </div>
    <h2>بيانات العميل</h2>
    <div class="row"><strong>الاسم:</strong><span>${escapeHtml(repair.customer_name)}</span></div>
    <div class="row"><strong>الهاتف:</strong><span>${escapeHtml(repair.customer_phone)}</span></div>
    <h2>بيانات الجهاز</h2>
    <div class="row"><strong>الموديل:</strong><span>${escapeHtml(repair.device_brand)} ${escapeHtml(repair.device_model)}</span></div>
    ${repair.imei ? `<div class="row"><strong>IMEI:</strong><span>${escapeHtml(repair.imei)}</span></div>` : ""}
    <div class="row"><strong>المشكلة:</strong><span>${escapeHtml(repair.problem)}</span></div>
    ${repair.device_condition ? `<div class="row"><strong>حالة الجهاز:</strong><span>${escapeHtml(repair.device_condition)}</span></div>` : ""}
    ${repair.accessories ? `<div class="row"><strong>المرفقات:</strong><span>${escapeHtml(repair.accessories)}</span></div>` : ""}
    <div class="row"><strong>التكلفة المتوقعة:</strong><span>${Number(repair.estimated_cost).toFixed(2)}</span></div>
    <div class="row"><strong>تاريخ الاستلام:</strong><span>${escapeHtml(new Date(repair.created_at).toLocaleString("ar-EG"))}</span></div>
    <div class="footer">يرجى الاحتفاظ بهذه الورقة لاستلام الجهاز</div>
</body>
</html>`;
    openPrintWindow(html);
}
