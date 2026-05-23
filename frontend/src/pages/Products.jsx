import { useEffect, useState } from "react";
import api, { formatError } from "../lib/api";
import { toast } from "sonner";
import { formatMoney } from "../lib/utils";
import { useSearchParams } from "react-router-dom";
import { Plus, Search, Edit2, Trash2, AlertTriangle, X, Package } from "lucide-react";

const empty = {
    name: "", type: "accessory", brand: "", model: "", storage: "", color: "",
    barcode: "", cost_price: 0, sale_price: 0, quantity: 0, min_quantity: 1, category: "",
};

export default function Products() {
    const [params] = useSearchParams();
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(empty);
    const [lowOnly, setLowOnly] = useState(params.get("low") === "1");

    const load = async () => {
        const r = await api.get("/products", { params: { search: search || undefined, low_stock: lowOnly } });
        setItems(r.data);
    };

    useEffect(() => { load(); }, [search, lowOnly]); // eslint-disable-line

    const openCreate = () => {
        setEditing(null);
        setForm(empty);
        setShowForm(true);
    };
    const openEdit = (p) => {
        setEditing(p);
        setForm({ ...empty, ...p });
        setShowForm(true);
    };

    const save = async (e) => {
        e.preventDefault();
        try {
            const body = {
                ...form,
                cost_price: Number(form.cost_price),
                sale_price: Number(form.sale_price),
                quantity: Number(form.quantity),
                min_quantity: Number(form.min_quantity),
            };
            if (editing) {
                await api.put(`/products/${editing.id}`, body);
                toast.success("تم التحديث");
            } else {
                await api.post("/products", body);
                toast.success("تم إضافة المنتج");
            }
            setShowForm(false);
            load();
        } catch (err) {
            toast.error(formatError(err?.response?.data?.detail));
        }
    };

    const remove = async (id) => {
        if (!window.confirm("تأكيد حذف المنتج؟")) return;
        try {
            await api.delete(`/products/${id}`);
            toast.success("تم الحذف");
            load();
        } catch (err) {
            toast.error(formatError(err?.response?.data?.detail));
        }
    };

    return (
        <div className="p-8 fade-in" data-testid="products-page">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Package className="w-8 h-8 text-blue-600" /> المنتجات والمخزون
                    </h1>
                    <p className="text-slate-500 mt-1">إدارة الإكسسوارات والمنتجات</p>
                </div>
                <button
                    onClick={openCreate}
                    data-testid="product-add-button"
                    className="h-12 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" /> إضافة منتج
                </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        data-testid="product-search-input"
                        placeholder="بحث بالاسم، الباركود، الموديل..."
                        className="w-full h-11 pr-10 pl-4 rounded-lg bg-white border border-slate-300 outline-none focus:border-blue-500"
                    />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} data-testid="product-low-stock-filter" />
                    <span className="text-sm text-slate-700">المخزون المنخفض فقط</span>
                </label>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200 text-right text-sm text-slate-600">
                        <tr>
                            <th className="p-4">المنتج</th>
                            <th className="p-4">النوع</th>
                            <th className="p-4">الكمية</th>
                            <th className="p-4">سعر التكلفة</th>
                            <th className="p-4">سعر البيع</th>
                            <th className="p-4">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 && (
                            <tr><td colSpan={6} className="p-12 text-center text-slate-500">لا توجد منتجات</td></tr>
                        )}
                        {items.map((p) => {
                            const low = p.quantity <= p.min_quantity;
                            return (
                                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50" data-testid={`product-row-${p.id}`}>
                                    <td className="p-4">
                                        <div className="font-semibold text-slate-900">{p.name}</div>
                                        <div className="text-xs text-slate-500">{p.brand} {p.model} {p.storage} {p.color}</div>
                                        {p.barcode && <div className="text-xs text-slate-400 mt-1">باركود: {p.barcode}</div>}
                                    </td>
                                    <td className="p-4 text-sm">{p.type === "device" ? "جهاز" : "إكسسوار"}</td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${low ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                                            {low && <AlertTriangle className="w-3 h-3" />}
                                            {p.quantity}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm">{formatMoney(p.cost_price)}</td>
                                    <td className="p-4 font-bold text-blue-600">{formatMoney(p.sale_price)} ر.س</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => openEdit(p)} data-testid={`product-edit-${p.id}`} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => remove(p.id)} data-testid={`product-delete-${p.id}`} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" data-testid="product-form-modal">
                    <form onSubmit={save} className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">{editing ? "تعديل منتج" : "إضافة منتج"}</h2>
                            <button type="button" onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="اسم المنتج" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} testId="form-product-name" />
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-slate-700">النوع</label>
                                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} data-testid="form-product-type" className="w-full h-11 px-3 rounded-lg bg-slate-50 border border-slate-300 outline-none">
                                    <option value="accessory">إكسسوار</option>
                                    <option value="device">جهاز</option>
                                </select>
                            </div>
                            <Field label="الماركة" value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} />
                            <Field label="الموديل" value={form.model} onChange={(v) => setForm({ ...form, model: v })} />
                            <Field label="السعة" value={form.storage} onChange={(v) => setForm({ ...form, storage: v })} />
                            <Field label="اللون" value={form.color} onChange={(v) => setForm({ ...form, color: v })} />
                            <Field label="الباركود" value={form.barcode} onChange={(v) => setForm({ ...form, barcode: v })} />
                            <Field label="الفئة" value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
                            <Field label="سعر التكلفة" type="number" value={form.cost_price} onChange={(v) => setForm({ ...form, cost_price: v })} />
                            <Field label="سعر البيع" type="number" required value={form.sale_price} onChange={(v) => setForm({ ...form, sale_price: v })} testId="form-product-sale-price" />
                            <Field label="الكمية" type="number" required value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} testId="form-product-quantity" />
                            <Field label="حد التنبيه" type="number" value={form.min_quantity} onChange={(v) => setForm({ ...form, min_quantity: v })} />
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button type="submit" data-testid="form-product-submit" className="flex-1 h-12 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold">{editing ? "حفظ التعديل" : "حفظ المنتج"}</button>
                            <button type="button" onClick={() => setShowForm(false)} className="px-6 h-12 rounded-lg border border-slate-300 hover:bg-slate-50">إلغاء</button>
                        </div>
                    </form>
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
