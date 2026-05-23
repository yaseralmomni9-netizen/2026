import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { formatMoney, formatDate } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from "recharts";
import {
    DollarSign, ShoppingBag, Package, AlertTriangle, Wrench, CreditCard,
    TrendingUp, Smartphone, ArrowLeft
} from "lucide-react";

function StatCard({ icon: Icon, label, value, sub, color = "blue", testId }) {
    const colors = {
        blue: "bg-blue-50 text-blue-600",
        emerald: "bg-emerald-50 text-emerald-600",
        amber: "bg-amber-50 text-amber-600",
        red: "bg-red-50 text-red-600",
        purple: "bg-purple-50 text-purple-600",
    };
    return (
        <div data-testid={testId} className="bg-white rounded-xl border border-slate-200 p-6 card-hover">
            <div className="flex items-start justify-between mb-3">
                <div className={`p-3 rounded-lg ${colors[color]}`}><Icon className="w-6 h-6" /></div>
            </div>
            <div className="text-sm text-slate-500 mb-1">{label}</div>
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
        </div>
    );
}

export default function Dashboard() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/reports/dashboard").then((r) => setData(r.data)).finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="p-8 text-slate-500">جاري التحميل...</div>;
    }
    if (!data) return null;

    return (
        <div className="p-8 fade-in" data-testid="dashboard-page">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">مرحباً، {user?.name} 👋</h1>
                <p className="text-slate-500 mt-2">ملخص أعمال محلك اليوم</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    icon={DollarSign}
                    label="مبيعات اليوم"
                    value={`${formatMoney(data.sales.today)} ر.س`}
                    sub={`${data.sales.today_count} فاتورة`}
                    color="blue"
                    testId="stat-today-sales"
                />
                <StatCard
                    icon={TrendingUp}
                    label="مبيعات الشهر"
                    value={`${formatMoney(data.sales.month)} ر.س`}
                    sub={`${data.sales.month_count} فاتورة`}
                    color="emerald"
                    testId="stat-month-sales"
                />
                <StatCard
                    icon={Package}
                    label="إجمالي المنتجات"
                    value={data.inventory.total_products}
                    sub={`قيمة المخزون: ${formatMoney(data.inventory.total_value)} ر.س`}
                    color="purple"
                    testId="stat-inventory"
                />
                <StatCard
                    icon={Smartphone}
                    label="الأجهزة المتاحة"
                    value={data.inventory.devices_available}
                    sub={`من أصل ${data.inventory.devices_total}`}
                    color="blue"
                    testId="stat-devices"
                />
                <StatCard
                    icon={AlertTriangle}
                    label="مخزون منخفض"
                    value={data.inventory.low_stock_count}
                    sub="منتج يحتاج إعادة طلب"
                    color="amber"
                    testId="stat-low-stock"
                />
                <StatCard
                    icon={Wrench}
                    label="صيانة معلقة"
                    value={data.repairs.pending}
                    sub={`${data.repairs.ready} جاهز للاستلام`}
                    color="amber"
                    testId="stat-repairs"
                />
                <StatCard
                    icon={CreditCard}
                    label="إجمالي الديون"
                    value={`${formatMoney(data.installments.total_debt)} ر.س`}
                    sub={`${data.installments.overdue_count} متأخر`}
                    color="red"
                    testId="stat-debts"
                />
                <StatCard
                    icon={ShoppingBag}
                    label="أكثر مبيعاً"
                    value={data.top_products[0]?.name || "—"}
                    sub={data.top_products[0] ? `${data.top_products[0].qty} وحدة` : "لا توجد مبيعات"}
                    color="emerald"
                    testId="stat-top-product"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Daily sales chart */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">مبيعات آخر 7 أيام</h2>
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={data.daily_sales}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis dataKey="label" stroke="#64748B" />
                            <YAxis stroke="#64748B" />
                            <Tooltip />
                            <Line type="monotone" dataKey="total" stroke="#2563EB" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Top products */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">أكثر المنتجات مبيعاً</h2>
                    {data.top_products.length === 0 ? (
                        <p className="text-slate-500 text-sm">لا توجد بيانات</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={data.top_products} layout="vertical">
                                <XAxis type="number" stroke="#64748B" />
                                <YAxis dataKey="name" type="category" stroke="#64748B" width={100} />
                                <Tooltip />
                                <Bar dataKey="qty" fill="#10B981" radius={[0, 8, 8, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Low stock list */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-900">تنبيهات المخزون</h2>
                        <Link to="/products?low=1" className="text-sm text-blue-600 hover:underline flex items-center gap-1">عرض الكل <ArrowLeft className="w-4 h-4" /></Link>
                    </div>
                    {data.inventory.low_stock_items.length === 0 ? (
                        <p className="text-slate-500 text-sm">المخزون بحالة جيدة</p>
                    ) : (
                        <ul className="space-y-3">
                            {data.inventory.low_stock_items.map((p) => (
                                <li key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
                                    <span className="font-medium text-slate-800">{p.name}</span>
                                    <span className="text-sm font-bold text-amber-700">{p.quantity} قطعة</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Overdue debts */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-900">الديون المتأخرة</h2>
                        <Link to="/installments" className="text-sm text-blue-600 hover:underline flex items-center gap-1">إدارة التقسيط <ArrowLeft className="w-4 h-4" /></Link>
                    </div>
                    {data.installments.overdue_items.length === 0 ? (
                        <p className="text-slate-500 text-sm">لا توجد ديون متأخرة</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-slate-500 text-right">
                                    <tr><th className="py-2">العميل</th><th>الهاتف</th><th>المتبقي</th><th>الاستحقاق</th></tr>
                                </thead>
                                <tbody>
                                    {data.installments.overdue_items.map((i) => (
                                        <tr key={i.id} className="border-t border-slate-200">
                                            <td className="py-2 font-medium">{i.customer_name}</td>
                                            <td className="text-slate-600">{i.customer_phone}</td>
                                            <td className="font-bold text-red-600">{formatMoney(i.remaining)}</td>
                                            <td className="text-slate-600">{formatDate(i.next_due_date)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
