import { useEffect, useState } from "react";
import api, { formatError } from "../lib/api";
import { toast } from "sonner";
import { formatMoney, DEVICE_STATUS_LABELS, DEVICE_STATUS_COLORS } from "../lib/utils";
import { Plus, Search, Edit2, Trash2, X, Smartphone } from "lucide-react";

const empty = {
    imei: "", brand: "", model: "", storage: "", color: "",
    condition: "new", cost_price: 0, sale_price: 0, notes: "",
};

export default function Devices() {
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(empty);

    const load = async () => {
        const r = await api.get("/devices", { params: { search: search || undefined, status: statusFilter || undefined } });
        setItems(r.data);
    };
    useEffect(() => { load(); }, [search, statusFilter]); // eslint-disable-line

    const save = async (e) => {
        e.preventDefault();
        try {
            const body = {
                ...form,
                cost_price: Number(form.cost_price),
                sale_price: Number(form.sale_price),
            };
            if (editing) {
                await api.put(`/devices/${editing.id}`, body);
                toast.success("تم التحديث");
            } else {
                await api.post("/devices", body);
                toast.success("تم إضافة الجهاز");
            }
            setShowForm(false);
            load();
        } catch (err) {
            toast.error(formatError(err?.response?.data?.detail));
        }
    };

    const remove = async (id) => {
        if (!window.confirm("تأكيد حذف الجهاز؟")) return;
        try {
            await api.delete(`/devices/${id}`);
            toast.success("تم الحذف");
            load();
        } catch (err) {
            toast.error(formatError(err?.response?.data?.detail));
        }
    };

    return (
        <div className="p-8 fade-in" data-testid="devices-page">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Smartphone className="w-8 h-8 text-blue-600" /> أجهزة الموبايل (IMEI)
                    </h1>
                    <p className="text-slate-500 mt-1">تتبع كامل لجميع أجهزة الموبايل برقم IMEI</p>
                </div>
                <button
                    onClick={() => { setEditing(null); setForm(empty); setShowForm(true); }}
                    data-testid="device-add-button"
                    className="h-12 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" /> إضافة جهاز
                </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        data-testid="device-search-input"
                        placeholder="بحث بـ IMEI، الموديل، الماركة..."
                        className="w-full h-11 pr-10 pl-4 rounded-lg bg-white border border-slate-300 outline-none focus:border-blue-500"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    data-testid="device-status-filter"
                    className="h-11 px-4 rounded-lg bg-white border border-slate-300 outline-none focus:border-blue-500"
                >
                    <option value="">جميع الحالات</option>
                    {Object.entries(DEVICE_STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                    ))}
                </select>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200 text-right text-sm text-slate-600">
                        <tr>
                            <th className="p-4">IMEI</th>
                            <th className="p-4">الجهاز</th>
                            <th className="p-4">الحالة</th>
                            <th className="p-4">السعر</th>
                            <th className="p-4">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 && (
                            <tr><td colSpan={5} className="p-12 text-center text-slate-500">لا توجد أجهزة</td></tr>
                        )}
                        {items.map((d) => (
                            <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50" data-testid={`device-row-${d.id}`}>
                                <td className="p-4 font-mono text-sm">{d.imei}</td>
                                <td className="p-4">
                                    <div className="font-semibold">{d.brand} {d.model}</div>
                                    <div className="text-xs text-slate-500">{d.storage} {d.color} • {d.condition === "new" ? "جديد" : d.condition === "used" ? "مستعمل" : "مجدد"}</div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${DEVICE_STATUS_COLORS[d.status]}`}>
                                        {DEVICE_STATUS_LABELS[d.status]}
                                    </span>
                                </td>
                                <td className="p-4 font-bold text-blue-600">{formatMoney(d.sale_price)} ر.س</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => { setEditing(d); setForm({ ...empty, ...d }); setShowForm(true); }} data-testid={`device-edit-${d.id}`} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => remove(d.id)} data-testid={`device-delete-${d.id}`} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
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
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" data-testid="device-form-modal">
                    <form onSubmit={save} className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">{editing ? "تعديل جهاز" : "إضافة جهاز جديد"}</h2>
                            <button type="button" onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="IMEI" required value={form.imei} onChange={(v) => setForm({ ...form, imei: v })} testId="form-device-imei" disabled={!!editing} />
                            <div>
                                <label className="text-sm font-semibold text-slate-700">الحالة</label>
                                <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} data-testid="form-device-condition" className="w-full h-11 px-3 mt-1 rounded-lg bg-slate-50 border border-slate-300 outline-none">
                                    <option value="new">جديد</option>
                                    <option value="used">مستعمل</option>
                                    <option value="refurbished">مجدد</option>
                                </select>
                            </div>
                            <Field label="الماركة" required value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} testId="form-device-brand" />
                            <Field label="الموديل" required value={form.model} onChange={(v) => setForm({ ...form, model: v })} testId="form-device-model" />
                            <Field label="السعة" value={form.storage} onChange={(v) => setForm({ ...form, storage: v })} />
                            <Field label="اللون" value={form.color} onChange={(v) => setForm({ ...form, color: v })} />
                            <Field label="سعر التكلفة" type="number" value={form.cost_price} onChange={(v) => setForm({ ...form, cost_price: v })} />
                            <Field label="سعر البيع" type="number" required value={form.sale_price} onChange={(v) => setForm({ ...form, sale_price: v })} testId="form-device-sale-price" />
                            <div className="md:col-span-2">
                                <label className="text-sm font-semibold text-slate-700">ملاحظات</label>
                                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full px-3 py-2 mt-1 rounded-lg bg-slate-50 border border-slate-300 outline-none focus:bg-white focus:border-blue-500" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button type="submit" data-testid="form-device-submit" className="flex-1 h-12 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold">{editing ? "حفظ التعديل" : "حفظ الجهاز"}</button>
                            <button type="button" onClick={() => setShowForm(false)} className="px-6 h-12 rounded-lg border border-slate-300">إلغاء</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function Field({ label, value, onChange, type = "text", required, testId, disabled }) {
    return (
        <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">{label}{required && <span className="text-red-500">*</span>}</label>
            <input
                type={type}
                value={value}
                required={required}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                data-testid={testId}
                className="w-full h-11 px-3 rounded-lg bg-slate-50 border border-slate-300 outline-none focus:bg-white focus:border-blue-500 disabled:opacity-60"
            />
        </div>
    );
}
