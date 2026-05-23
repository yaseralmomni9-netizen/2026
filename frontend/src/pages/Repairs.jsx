import { useEffect, useState } from "react";
import api, { formatError } from "../lib/api";
import { toast } from "sonner";
import { formatDateTime, REPAIR_STATUS_LABELS, REPAIR_STATUS_COLORS, formatMoney } from "../lib/utils";
import { printRepairTicket } from "../lib/invoice";
import { Plus, Search, X, Wrench, Printer } from "lucide-react";

const empty = {
    customer_name: "", customer_phone: "", device_brand: "", device_model: "",
    imei: "", problem: "", device_condition: "", accessories: "", estimated_cost: 0, notes: "",
};

export default function Repairs() {
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [detailRepair, setDetailRepair] = useState(null);
    const [form, setForm] = useState(empty);

    const load = async () => {
        const r = await api.get("/repairs", { params: { search: search || undefined, status: statusFilter || undefined } });
        setItems(r.data);
    };
    useEffect(() => { load(); }, [search, statusFilter]); // eslint-disable-line

    const save = async (e) => {
        e.preventDefault();
        try {
            const r = await api.post("/repairs", { ...form, estimated_cost: Number(form.estimated_cost) });
            toast.success(`تم إنشاء تذكرة: ${r.data.ticket_number}`);
            setShowForm(false);
            setForm(empty);
            load();
            printRepairTicket(r.data);
        } catch (err) {
            toast.error(formatError(err?.response?.data?.detail));
        }
    };

    const changeStatus = async (id, status) => {
        try {
            await api.put(`/repairs/${id}`, { status });
            toast.success("تم تحديث الحالة");
            load();
            if (detailRepair?.id === id) {
                const r = await api.get(`/repairs/${id}`);
                setDetailRepair(r.data);
            }
        } catch (err) {
            toast.error(formatError(err?.response?.data?.detail));
        }
    };

    const updateFinalCost = async (id, cost) => {
        try {
            await api.put(`/repairs/${id}`, { final_cost: Number(cost) });
            toast.success("تم التحديث");
            load();
        } catch (err) {
            toast.error(formatError(err?.response?.data?.detail));
        }
    };

    return (
        <div className="p-8 fade-in" data-testid="repairs-page">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Wrench className="w-8 h-8 text-blue-600" /> إدارة الصيانة
                    </h1>
                    <p className="text-slate-500 mt-1">تتبع جميع تذاكر الصيانة وحالاتها</p>
                </div>
                <button
                    onClick={() => { setForm(empty); setShowForm(true); }}
                    data-testid="repair-add-button"
                    className="h-12 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" /> تذكرة جديدة
                </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        data-testid="repair-search-input"
                        placeholder="بحث برقم التذكرة، اسم العميل، الهاتف، IMEI..."
                        className="w-full h-11 pr-10 pl-4 rounded-lg bg-white border border-slate-300 outline-none focus:border-blue-500"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    data-testid="repair-status-filter"
                    className="h-11 px-4 rounded-lg bg-white border border-slate-300 outline-none"
                >
                    <option value="">جميع الحالات</option>
                    {Object.entries(REPAIR_STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                    ))}
                </select>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200 text-right text-sm text-slate-600">
                        <tr>
                            <th className="p-4">رقم التذكرة</th>
                            <th className="p-4">العميل</th>
                            <th className="p-4">الجهاز</th>
                            <th className="p-4">المشكلة</th>
                            <th className="p-4">الحالة</th>
                            <th className="p-4">التكلفة</th>
                            <th className="p-4">إجراء</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 && (
                            <tr><td colSpan={7} className="p-12 text-center text-slate-500">لا توجد تذاكر صيانة</td></tr>
                        )}
                        {items.map((r) => (
                            <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50" data-testid={`repair-row-${r.id}`}>
                                <td className="p-4 font-mono text-sm font-bold">{r.ticket_number}</td>
                                <td className="p-4">
                                    <div className="font-semibold">{r.customer_name}</div>
                                    <div className="text-xs text-slate-500">{r.customer_phone}</div>
                                </td>
                                <td className="p-4 text-sm">{r.device_brand} {r.device_model}</td>
                                <td className="p-4 text-sm max-w-xs truncate">{r.problem}</td>
                                <td className="p-4">
                                    <select
                                        value={r.status}
                                        onChange={(e) => changeStatus(r.id, e.target.value)}
                                        data-testid={`repair-status-${r.id}`}
                                        className={`px-2.5 py-1.5 rounded-md text-xs font-bold border-0 outline-none cursor-pointer ${REPAIR_STATUS_COLORS[r.status]}`}
                                    >
                                        {Object.entries(REPAIR_STATUS_LABELS).map(([k, v]) => (
                                            <option key={k} value={k}>{v}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="p-4 text-sm">
                                    <div>{formatMoney(r.estimated_cost)}</div>
                                    {r.final_cost > 0 && <div className="text-xs text-emerald-600 font-bold">نهائي: {formatMoney(r.final_cost)}</div>}
                                </td>
                                <td className="p-4">
                                    <button onClick={() => setDetailRepair(r)} data-testid={`repair-detail-${r.id}`} className="text-sm text-blue-600 hover:underline">تفاصيل</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* New repair form */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" data-testid="repair-form-modal">
                    <form onSubmit={save} className="bg-white rounded-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">تذكرة صيانة جديدة</h2>
                            <button type="button" onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="اسم العميل" required value={form.customer_name} onChange={(v) => setForm({ ...form, customer_name: v })} testId="form-repair-customer-name" />
                            <Field label="هاتف العميل" required value={form.customer_phone} onChange={(v) => setForm({ ...form, customer_phone: v })} testId="form-repair-customer-phone" />
                            <Field label="ماركة الجهاز" required value={form.device_brand} onChange={(v) => setForm({ ...form, device_brand: v })} testId="form-repair-brand" />
                            <Field label="موديل الجهاز" required value={form.device_model} onChange={(v) => setForm({ ...form, device_model: v })} testId="form-repair-model" />
                            <Field label="IMEI (اختياري)" value={form.imei} onChange={(v) => setForm({ ...form, imei: v })} />
                            <Field label="التكلفة المتوقعة" type="number" value={form.estimated_cost} onChange={(v) => setForm({ ...form, estimated_cost: v })} />
                            <div className="md:col-span-2">
                                <label className="text-sm font-semibold">المشكلة <span className="text-red-500">*</span></label>
                                <textarea required value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })} rows={3} data-testid="form-repair-problem" className="w-full px-3 py-2 mt-1 rounded-lg bg-slate-50 border border-slate-300 outline-none focus:bg-white focus:border-blue-500" />
                            </div>
                            <Field label="حالة الجهاز عند الاستلام" value={form.device_condition} onChange={(v) => setForm({ ...form, device_condition: v })} />
                            <Field label="المرفقات (شاحن، إلخ)" value={form.accessories} onChange={(v) => setForm({ ...form, accessories: v })} />
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button type="submit" data-testid="form-repair-submit" className="flex-1 h-12 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold">إنشاء التذكرة وطباعتها</button>
                            <button type="button" onClick={() => setShowForm(false)} className="px-6 h-12 rounded-lg border border-slate-300">إلغاء</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Detail modal */}
            {detailRepair && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" data-testid="repair-detail-modal">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">تذكرة {detailRepair.ticket_number}</h2>
                            <button onClick={() => setDetailRepair(null)}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-3 text-sm mb-4">
                            <div className="flex justify-between border-b border-slate-100 py-2"><span className="text-slate-500">العميل:</span><span className="font-semibold">{detailRepair.customer_name}</span></div>
                            <div className="flex justify-between border-b border-slate-100 py-2"><span className="text-slate-500">الهاتف:</span><span>{detailRepair.customer_phone}</span></div>
                            <div className="flex justify-between border-b border-slate-100 py-2"><span className="text-slate-500">الجهاز:</span><span>{detailRepair.device_brand} {detailRepair.device_model}</span></div>
                            {detailRepair.imei && <div className="flex justify-between border-b border-slate-100 py-2"><span className="text-slate-500">IMEI:</span><span className="font-mono">{detailRepair.imei}</span></div>}
                            <div className="border-b border-slate-100 py-2"><div className="text-slate-500 mb-1">المشكلة:</div><div>{detailRepair.problem}</div></div>
                            <div className="flex justify-between border-b border-slate-100 py-2"><span className="text-slate-500">تاريخ الاستلام:</span><span>{formatDateTime(detailRepair.created_at)}</span></div>
                            <div className="flex justify-between border-b border-slate-100 py-2"><span className="text-slate-500">الحالة:</span>
                                <span className={`px-2 py-1 rounded text-xs font-bold ${REPAIR_STATUS_COLORS[detailRepair.status]}`}>
                                    {REPAIR_STATUS_LABELS[detailRepair.status]}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <span className="text-slate-500 text-sm">التكلفة النهائية:</span>
                                <input
                                    type="number"
                                    defaultValue={detailRepair.final_cost}
                                    onBlur={(e) => updateFinalCost(detailRepair.id, e.target.value)}
                                    data-testid="repair-detail-final-cost"
                                    className="flex-1 h-10 px-3 rounded-lg bg-slate-50 border border-slate-300 outline-none"
                                />
                                <span className="text-slate-500">ر.س</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => printRepairTicket(detailRepair)} className="flex-1 h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2">
                                <Printer className="w-4 h-4" /> طباعة التذكرة
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({ label, value, onChange, type = "text", required, testId }) {
    return (
        <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">{label}{required && <span className="text-red-500">*</span>}</label>
            <input
                type={type}
                value={value}
                required={required}
                onChange={(e) => onChange(e.target.value)}
                data-testid={testId}
                className="w-full h-11 px-3 rounded-lg bg-slate-50 border border-slate-300 outline-none focus:bg-white focus:border-blue-500"
            />
        </div>
    );
}
