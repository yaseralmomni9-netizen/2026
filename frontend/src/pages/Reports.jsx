import { useEffect, useState } from "react";
import api from "../lib/api";
import { formatMoney, formatDateTime, PAYMENT_METHOD_LABELS } from "../lib/utils";
import { printInvoice, sendInvoiceViaWhatsApp } from "../lib/invoice";
import { BarChart3, Printer, MessageCircle, FileDown } from "lucide-react";

export default function Reports() {
    const [sales, setSales] = useState([]);
    const [filter, setFilter] = useState("today");

    const load = async () => {
        const r = await api.get("/sales");
        setSales(r.data);
    };
    useEffect(() => { load(); }, []);

    const filtered = sales.filter((s) => {
        const now = new Date();
        const sDate = new Date(s.created_at);
        if (filter === "today") return sDate.toDateString() === now.toDateString();
        if (filter === "week") return (now - sDate) < 7 * 86400000;
        if (filter === "month") return sDate.getMonth() === now.getMonth() && sDate.getFullYear() === now.getFullYear();
        return true;
    });

    const total = filtered.reduce((s, x) => s + x.total, 0);
    const profit = filtered.reduce((s, x) => s + x.total - x.discount, 0); // simplified
    const cashTotal = filtered.filter(s => s.payment_method === "cash").reduce((a, b) => a + b.total, 0);
    const cardTotal = filtered.filter(s => s.payment_method === "card").reduce((a, b) => a + b.total, 0);
    const installmentTotal = filtered.filter(s => s.payment_method === "installment").reduce((a, b) => a + b.total, 0);

    return (
        <div className="p-8 fade-in" data-testid="reports-page">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-blue-600" /> التقارير المالية
                    </h1>
                    <p className="text-slate-500 mt-1">تقارير المبيعات والفواتير</p>
                </div>
                <div className="flex gap-2">
                    {[
                        { k: "today", label: "اليوم" },
                        { k: "week", label: "الأسبوع" },
                        { k: "month", label: "الشهر" },
                        { k: "all", label: "الكل" },
                    ].map((f) => (
                        <button
                            key={f.k}
                            onClick={() => setFilter(f.k)}
                            data-testid={`report-filter-${f.k}`}
                            className={`h-10 px-4 rounded-lg font-bold text-sm transition ${filter === f.k ? "bg-blue-600 text-white" : "bg-white border border-slate-300 text-slate-700"}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-slate-200 p-5"><div className="text-sm text-slate-500">إجمالي المبيعات</div><div className="text-2xl font-bold text-blue-600 mt-1" data-testid="report-total-sales">{formatMoney(total)} ر.س</div></div>
                <div className="bg-white rounded-xl border border-slate-200 p-5"><div className="text-sm text-slate-500">عدد الفواتير</div><div className="text-2xl font-bold text-slate-900 mt-1">{filtered.length}</div></div>
                <div className="bg-white rounded-xl border border-slate-200 p-5"><div className="text-sm text-slate-500">كاش</div><div className="text-2xl font-bold text-emerald-600 mt-1">{formatMoney(cashTotal)}</div></div>
                <div className="bg-white rounded-xl border border-slate-200 p-5"><div className="text-sm text-slate-500">بطاقة + تقسيط</div><div className="text-2xl font-bold text-purple-600 mt-1">{formatMoney(cardTotal + installmentTotal)}</div></div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200">
                    <h2 className="font-bold text-slate-900">سجل الفواتير</h2>
                </div>
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200 text-right text-sm text-slate-600">
                        <tr>
                            <th className="p-4">الفاتورة</th>
                            <th className="p-4">العميل</th>
                            <th className="p-4">المنتجات</th>
                            <th className="p-4">الدفع</th>
                            <th className="p-4">الكاشير</th>
                            <th className="p-4">التاريخ</th>
                            <th className="p-4">الإجمالي</th>
                            <th className="p-4"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr><td colSpan={8} className="p-12 text-center text-slate-500">لا توجد فواتير</td></tr>
                        )}
                        {filtered.map((s) => (
                            <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50" data-testid={`sale-row-${s.id}`}>
                                <td className="p-4 font-mono text-sm font-bold">{s.invoice_number}</td>
                                <td className="p-4 text-sm">{s.customer_name || "زبون نقدي"}</td>
                                <td className="p-4 text-sm">{s.items.length} منتج</td>
                                <td className="p-4 text-sm">{PAYMENT_METHOD_LABELS[s.payment_method]}</td>
                                <td className="p-4 text-sm">{s.cashier_name}</td>
                                <td className="p-4 text-sm text-slate-500">{formatDateTime(s.created_at)}</td>
                                <td className="p-4 font-bold text-blue-600">{formatMoney(s.total)} ر.س</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => printInvoice(s)} data-testid={`sale-print-${s.id}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="طباعة">
                                            <Printer className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => sendInvoiceViaWhatsApp(s)} data-testid={`sale-whatsapp-${s.id}`} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="واتساب">
                                            <MessageCircle className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
