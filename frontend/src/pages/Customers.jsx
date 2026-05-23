import { useEffect, useState } from "react";
import api, { formatError } from "../lib/api";
import { toast } from "sonner";
import { formatMoney, formatDateTime, PAYMENT_METHOD_LABELS, REPAIR_STATUS_LABELS } from "../lib/utils";
import { Plus, Search, Edit2, Trash2, X, Users, ShoppingBag, Wrench } from "lucide-react";

const empty = { name: "", phone: "", address: "", notes: "" };

export default function Customers() {
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(empty);
    const [detail, setDetail] = useState(null);
    const [history, setHistory] = useState({ sales: [], repairs: [] });

    const load = async () => {
        const r = await api.get("/customers", { params: { search: search || undefined } });
        setItems(r.data);
    };
    useEffect(() => { load(); }, [search]); // eslint-disable-line

    const save = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                await api.put(`/customers/${editing.id}`, form);
                toast.success("تم التحديث");
            } else {
                await api.post("/customers", form);
                toast.success("تم إضافة العميل");
            }
            setShowForm(false);
            load();
        } catch (err) {
            toast.error(formatError(err?.response?.data?.detail));
        }
    };

    const remove = async (id) => {
        if (!window.confirm("تأكيد حذف العميل؟")) return;
        try {
            await api.delete(`/customers/${id}`);
            toast.success("تم الحذف");
            load();
        } catch (err) {
            toast.error(formatError(err?.response?.data?.detail));
        }
    };

    const openDetail = async (c) => {
        setDetail(c);
        const r = await api.get(`/customers/${c.id}/history`);
        setHistory(r.data);
    };

    return (
        <div className="p-8 fade-in" data-testid="customers-page">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Users className="w-8 h-8 text-blue-600" /> العملاء
                    </h1>
                    <p className="text-slate-500 mt-1">قاعدة بيانات العملاء وسجل تعاملاتهم</p>
                </div>
                <button
                    onClick={() => { setEditing(null); setForm(empty); setShowForm(true); }}
                    data-testid="customer-add-button"
                    className="h-12 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" /> إضافة عميل
                </button>
            </div>

            <div className="relative max-w-md mb-4">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    data-testid="customer-search-input"
                    placeholder="بحث بالاسم أو الهاتف..."
                    className="w-full h-11 pr-10 pl-4 rounded-lg bg-white border border-slate-300 outline-none focus:border-blue-500"
                />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200 text-right text-sm text-slate-600">
                        <tr>
                            <th className="p-4">الاسم</th>
                            <th className="p-4">الهاتف</th>
                            <th className="p-4">العنوان</th>
                            <th className="p-4">ملاحظات</th>
                            <th className="p-4">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 && (
                            <tr><td colSpan={5} className="p-12 text-center text-slate-500">لا يوجد عملاء</td></tr>
                        )}
                        {items.map((c) => (
                            <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50" data-testid={`customer-row-${c.id}`}>
                                <td className="p-4 font-semibold">{c.name}</td>
                                <td className="p-4 text-sm">{c.phone}</td>
                                <td className="p-4 text-sm text-slate-500">{c.address || "—"}</td>
                                <td className="p-4 text-sm text-slate-500 max-w-xs truncate">{c.notes || "—"}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => openDetail(c)} data-testid={`customer-history-${c.id}`} className="text-sm text-blue-600 hover:underline">السجل</button>
                                        <button onClick={() => { setEditing(c); setForm({ ...empty, ...c }); setShowForm(true); }} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => remove(c.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" data-testid="customer-form-modal">
                    <form onSubmit={save} className="bg-white rounded-2xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">{editing ? "تعديل عميل" : "إضافة عميل جديد"}</h2>
                            <button type="button" onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-4">
                            <Field label="الاسم" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} testId="form-customer-name" />
                            <Field label="الهاتف" required value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} testId="form-customer-phone" />
                            <Field label="العنوان" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
                            <div>
                                <label className="text-sm font-semibold">ملاحظات</label>
                                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full px-3 py-2 mt-1 rounded-lg bg-slate-50 border border-slate-300 outline-none focus:bg-white focus:border-blue-500" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button type="submit" data-testid="form-customer-submit" className="flex-1 h-12 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold">{editing ? "حفظ" : "إضافة"}</button>
                            <button type="button" onClick={() => setShowForm(false)} className="px-6 h-12 rounded-lg border border-slate-300">إلغاء</button>
                        </div>
                    </form>
                </div>
            )}

            {detail && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" data-testid="customer-detail-modal">
                    <div className="bg-white rounded-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold">{detail.name}</h2>
                                <p className="text-sm text-slate-500">{detail.phone}</p>
                            </div>
                            <button onClick={() => setDetail(null)}><X className="w-5 h-5" /></button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-blue-600" /> سجل المشتريات ({history.sales.length})</h3>
                                {history.sales.length === 0 ? <p className="text-sm text-slate-500">لا توجد مشتريات</p> : (
                                    <div className="space-y-2">
                                        {history.sales.map((s) => (
                                            <div key={s.id} className="p-3 bg-slate-50 rounded-lg">
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="font-bold">{s.invoice_number}</span>
                                                    <span className="text-slate-500">{formatDateTime(s.created_at)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span>{s.items.length} منتج • {PAYMENT_METHOD_LABELS[s.payment_method]}</span>
                                                    <span className="font-bold text-blue-600">{formatMoney(s.total)} ر.س</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Wrench className="w-5 h-5 text-amber-600" /> سجل الصيانة ({history.repairs.length})</h3>
                                {history.repairs.length === 0 ? <p className="text-sm text-slate-500">لا توجد طلبات صيانة</p> : (
                                    <div className="space-y-2">
                                        {history.repairs.map((r) => (
                                            <div key={r.id} className="p-3 bg-slate-50 rounded-lg">
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="font-bold">{r.ticket_number}</span>
                                                    <span className="text-slate-500">{formatDateTime(r.created_at)}</span>
                                                </div>
                                                <div className="text-sm">{r.device_brand} {r.device_model} — {r.problem}</div>
                                                <div className="text-xs text-slate-500 mt-1">الحالة: {REPAIR_STATUS_LABELS[r.status]}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({ label, value, onChange, required, testId }) {
    return (
        <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">{label}{required && <span className="text-red-500">*</span>}</label>
            <input
                value={value}
                required={required}
                onChange={(e) => onChange(e.target.value)}
                data-testid={testId}
                className="w-full h-11 px-3 rounded-lg bg-slate-50 border border-slate-300 outline-none focus:bg-white focus:border-blue-500"
            />
        </div>
    );
}
