import { useEffect, useState } from "react";
import api, { formatError } from "../lib/api";
import { toast } from "sonner";
import { formatMoney, formatDateTime, formatDate } from "../lib/utils";
import { CreditCard, X, Search, AlertCircle } from "lucide-react";

export default function Installments() {
    const [items, setItems] = useState([]);
    const [statusFilter, setStatusFilter] = useState("");
    const [detail, setDetail] = useState(null);
    const [payAmount, setPayAmount] = useState("");
    const [payNotes, setPayNotes] = useState("");
    const [search, setSearch] = useState("");

    const load = async () => {
        const r = await api.get("/installments", { params: { status: statusFilter || undefined } });
        setItems(r.data);
    };
    useEffect(() => { load(); }, [statusFilter]); // eslint-disable-line

    const filtered = items.filter((i) =>
        !search || i.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        i.customer_phone.includes(search) || i.invoice_number.toLowerCase().includes(search.toLowerCase())
    );

    const submitPayment = async () => {
        if (!payAmount || Number(payAmount) <= 0) {
            toast.error("ادخل مبلغ صحيح");
            return;
        }
        try {
            const r = await api.post(`/installments/${detail.id}/pay`, { amount: Number(payAmount), notes: payNotes });
            toast.success("تم تسجيل الدفعة");
            setDetail(r.data);
            setPayAmount("");
            setPayNotes("");
            load();
        } catch (err) {
            toast.error(formatError(err?.response?.data?.detail));
        }
    };

    const statusBadge = (s) => {
        const map = {
            active: { label: "نشط", cls: "bg-blue-100 text-blue-800" },
            completed: { label: "مكتمل", cls: "bg-emerald-100 text-emerald-800" },
            overdue: { label: "متأخر", cls: "bg-red-100 text-red-800" },
        };
        const v = map[s] || map.active;
        return <span className={`px-2.5 py-1 rounded text-xs font-bold ${v.cls}`}>{v.label}</span>;
    };

    return (
        <div className="p-8 fade-in" data-testid="installments-page">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <CreditCard className="w-8 h-8 text-blue-600" /> التقسيط والديون
                    </h1>
                    <p className="text-slate-500 mt-1">متابعة خطط التقسيط والدفعات المستحقة</p>
                </div>
            </div>

            <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        data-testid="installment-search-input"
                        placeholder="بحث برقم الفاتورة، الاسم، الهاتف..."
                        className="w-full h-11 pr-10 pl-4 rounded-lg bg-white border border-slate-300 outline-none focus:border-blue-500"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    data-testid="installment-status-filter"
                    className="h-11 px-4 rounded-lg bg-white border border-slate-300 outline-none"
                >
                    <option value="">الكل</option>
                    <option value="active">نشط</option>
                    <option value="completed">مكتمل</option>
                </select>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200 text-right text-sm text-slate-600">
                        <tr>
                            <th className="p-4">الفاتورة</th>
                            <th className="p-4">العميل</th>
                            <th className="p-4">الإجمالي</th>
                            <th className="p-4">المتبقي</th>
                            <th className="p-4">القسط الشهري</th>
                            <th className="p-4">الاستحقاق التالي</th>
                            <th className="p-4">الحالة</th>
                            <th className="p-4"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr><td colSpan={8} className="p-12 text-center text-slate-500">لا توجد خطط تقسيط</td></tr>
                        )}
                        {filtered.map((i) => (
                            <tr key={i.id} className="border-b border-slate-100 hover:bg-slate-50" data-testid={`installment-row-${i.id}`}>
                                <td className="p-4 font-mono text-sm font-bold">{i.invoice_number}</td>
                                <td className="p-4">
                                    <div className="font-semibold">{i.customer_name}</div>
                                    <div className="text-xs text-slate-500">{i.customer_phone}</div>
                                </td>
                                <td className="p-4 text-sm">{formatMoney(i.total_amount)}</td>
                                <td className="p-4 font-bold text-red-600">{formatMoney(i.remaining)}</td>
                                <td className="p-4 text-sm">{formatMoney(i.monthly_installment)}</td>
                                <td className="p-4 text-sm">{formatDate(i.next_due_date)}</td>
                                <td className="p-4">{statusBadge(i.status)}</td>
                                <td className="p-4">
                                    <button onClick={() => setDetail(i)} data-testid={`installment-pay-${i.id}`} className="text-sm font-bold text-blue-600 hover:underline">دفعة</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {detail && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" data-testid="installment-detail-modal">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">خطة التقسيط — {detail.invoice_number}</h2>
                            <button onClick={() => setDetail(null)}><X className="w-5 h-5" /></button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <Stat label="العميل" value={detail.customer_name} />
                            <Stat label="الهاتف" value={detail.customer_phone} />
                            <Stat label="الإجمالي" value={`${formatMoney(detail.total_amount)} ر.س`} />
                            <Stat label="الدفعة الأولى" value={`${formatMoney(detail.down_payment)} ر.س`} />
                            <Stat label="القسط الشهري" value={`${formatMoney(detail.monthly_installment)} ر.س`} />
                            <Stat label="عدد الأشهر" value={detail.months} />
                            <Stat label="المتبقي" value={`${formatMoney(detail.remaining)} ر.س`} highlight />
                            <Stat label="الحالة" value={detail.status === "completed" ? "مكتمل" : detail.status === "overdue" ? "متأخر" : "نشط"} />
                        </div>

                        {detail.status !== "completed" && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                                <h3 className="font-bold mb-3">إضافة دفعة جديدة</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input
                                        type="number"
                                        value={payAmount}
                                        onChange={(e) => setPayAmount(e.target.value)}
                                        data-testid="installment-pay-amount"
                                        placeholder="المبلغ"
                                        className="h-11 px-3 rounded-lg bg-white border border-slate-300 outline-none"
                                    />
                                    <input
                                        value={payNotes}
                                        onChange={(e) => setPayNotes(e.target.value)}
                                        data-testid="installment-pay-notes"
                                        placeholder="ملاحظات (اختياري)"
                                        className="h-11 px-3 rounded-lg bg-white border border-slate-300 outline-none"
                                    />
                                </div>
                                <button onClick={submitPayment} data-testid="installment-pay-submit" className="mt-3 w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold">تسجيل الدفعة</button>
                            </div>
                        )}

                        <h3 className="font-bold mb-3 flex items-center gap-2">الدفعات السابقة ({detail.payments?.length || 0})</h3>
                        {(!detail.payments || detail.payments.length === 0) ? (
                            <p className="text-sm text-slate-500 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> لم يتم دفع أي قسط بعد</p>
                        ) : (
                            <div className="space-y-2">
                                {detail.payments.map((p) => (
                                    <div key={p.id} className="p-3 bg-slate-50 rounded-lg flex justify-between items-center text-sm">
                                        <div>
                                            <div className="font-bold text-emerald-700">+ {formatMoney(p.amount)} ر.س</div>
                                            <div className="text-xs text-slate-500">{formatDateTime(p.paid_at)} — {p.received_by}</div>
                                            {p.notes && <div className="text-xs text-slate-500 mt-1">{p.notes}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function Stat({ label, value, highlight }) {
    return (
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500 mb-1">{label}</div>
            <div className={`font-bold ${highlight ? "text-red-600 text-lg" : "text-slate-900"}`}>{value}</div>
        </div>
    );
}
