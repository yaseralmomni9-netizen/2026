import { useEffect, useState } from "react";
import api, { formatError } from "../lib/api";
import { toast } from "sonner";
import { ROLE_LABELS, formatDate } from "../lib/utils";
import { Plus, Edit2, Trash2, X, UserCog } from "lucide-react";

const empty = { email: "", name: "", role: "sales", password: "" };

export default function Users() {
    const [items, setItems] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(empty);

    const load = async () => {
        const r = await api.get("/users");
        setItems(r.data);
    };
    useEffect(() => { load(); }, []);

    const save = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                const body = { name: form.name, role: form.role };
                if (form.password) body.password = form.password;
                await api.put(`/users/${editing.id}`, body);
                toast.success("تم التحديث");
            } else {
                await api.post("/users", form);
                toast.success("تم إضافة المستخدم");
            }
            setShowForm(false);
            load();
        } catch (err) {
            toast.error(formatError(err?.response?.data?.detail));
        }
    };

    const remove = async (id) => {
        if (!window.confirm("تأكيد حذف المستخدم؟")) return;
        try {
            await api.delete(`/users/${id}`);
            toast.success("تم الحذف");
            load();
        } catch (err) {
            toast.error(formatError(err?.response?.data?.detail));
        }
    };

    return (
        <div className="p-8 fade-in" data-testid="users-page">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <UserCog className="w-8 h-8 text-blue-600" /> المستخدمين والصلاحيات
                    </h1>
                    <p className="text-slate-500 mt-1">إدارة المستخدمين وأدوارهم في النظام</p>
                </div>
                <button
                    onClick={() => { setEditing(null); setForm(empty); setShowForm(true); }}
                    data-testid="user-add-button"
                    className="h-12 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" /> إضافة مستخدم
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200 text-right text-sm text-slate-600">
                        <tr>
                            <th className="p-4">الاسم</th>
                            <th className="p-4">البريد</th>
                            <th className="p-4">الدور</th>
                            <th className="p-4">تاريخ الإنشاء</th>
                            <th className="p-4">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((u) => (
                            <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50" data-testid={`user-row-${u.id}`}>
                                <td className="p-4 font-semibold">{u.name}</td>
                                <td className="p-4 text-sm">{u.email}</td>
                                <td className="p-4">
                                    <span className={`px-2.5 py-1 rounded text-xs font-bold ${u.role === "admin" ? "bg-purple-100 text-purple-800" : u.role === "sales" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}`}>
                                        {ROLE_LABELS[u.role]}
                                    </span>
                                </td>
                                <td className="p-4 text-sm text-slate-500">{formatDate(u.created_at)}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => { setEditing(u); setForm({ ...empty, ...u, password: "" }); setShowForm(true); }} data-testid={`user-edit-${u.id}`} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => remove(u.id)} data-testid={`user-delete-${u.id}`} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
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
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" data-testid="user-form-modal">
                    <form onSubmit={save} className="bg-white rounded-2xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">{editing ? "تعديل مستخدم" : "إضافة مستخدم جديد"}</h2>
                            <button type="button" onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-semibold">الاسم <span className="text-red-500">*</span></label>
                                <input value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="form-user-name" className="w-full h-11 px-3 rounded-lg bg-slate-50 border border-slate-300 outline-none focus:bg-white focus:border-blue-500" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-semibold">البريد الإلكتروني <span className="text-red-500">*</span></label>
                                <input type="email" value={form.email} required disabled={!!editing} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="form-user-email" className="w-full h-11 px-3 rounded-lg bg-slate-50 border border-slate-300 outline-none focus:bg-white focus:border-blue-500 disabled:opacity-60" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-semibold">الدور</label>
                                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} data-testid="form-user-role" className="w-full h-11 px-3 rounded-lg bg-slate-50 border border-slate-300 outline-none focus:bg-white">
                                    <option value="admin">مدير</option>
                                    <option value="sales">موظف بيع</option>
                                    <option value="repair">موظف صيانة</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-semibold">كلمة المرور {!editing && <span className="text-red-500">*</span>}</label>
                                <input type="password" value={form.password} required={!editing} placeholder={editing ? "اتركها فارغة للإبقاء على الحالية" : ""} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="form-user-password" className="w-full h-11 px-3 rounded-lg bg-slate-50 border border-slate-300 outline-none focus:bg-white focus:border-blue-500" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button type="submit" data-testid="form-user-submit" className="flex-1 h-12 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold">{editing ? "حفظ" : "إضافة"}</button>
                            <button type="button" onClick={() => setShowForm(false)} className="px-6 h-12 rounded-lg border border-slate-300">إلغاء</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
