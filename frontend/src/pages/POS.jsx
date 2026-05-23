import { useCallback, useEffect, useMemo, useState } from "react";
import api, { formatError } from "../lib/api";
import { toast } from "sonner";
import { formatMoney, PAYMENT_METHOD_LABELS } from "../lib/utils";
import { printInvoice, sendInvoiceViaWhatsApp } from "../lib/invoice";
import {
    Search, Plus, Minus, Trash2, ShoppingCart, Smartphone, Package,
    Printer, MessageCircle, X, User as UserIcon, CreditCard, Banknote, Calendar
} from "lucide-react";

export default function POS() {
    const [products, setProducts] = useState([]);
    const [devices, setDevices] = useState([]);
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState("products");
    const [cart, setCart] = useState([]);
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [customer, setCustomer] = useState(null);
    const [discount, setDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [downPayment, setDownPayment] = useState(0);
    const [months, setMonths] = useState(6);
    const [lastSale, setLastSale] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const loadProducts = useCallback(async (q = "") => {
        const r = await api.get("/products", { params: { search: q || undefined } });
        setProducts(r.data.filter((p) => p.quantity > 0));
    }, []);
    const loadDevices = useCallback(async (q = "") => {
        const r = await api.get("/devices", { params: { search: q || undefined, status: "available" } });
        setDevices(r.data);
    }, []);

    useEffect(() => {
        loadProducts();
        loadDevices();
    }, [loadProducts, loadDevices]);

    useEffect(() => {
        const t = setTimeout(() => {
            if (tab === "products") loadProducts(search);
            else loadDevices(search);
        }, 200);
        return () => clearTimeout(t);
    }, [search, tab, loadProducts, loadDevices]);

    const addProduct = (p) => {
        setCart((prev) => {
            const existing = prev.find((i) => i.product_id === p.id);
            if (existing) {
                if (existing.quantity >= p.quantity) {
                    toast.error("الكمية المتاحة في المخزون: " + p.quantity);
                    return prev;
                }
                return prev.map((i) => i.product_id === p.id ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unit_price } : i);
            }
            return [...prev, {
                product_id: p.id,
                name: p.name,
                quantity: 1,
                unit_price: p.sale_price,
                total: p.sale_price,
                stock: p.quantity,
            }];
        });
    };

    const addDevice = (d) => {
        if (cart.find((i) => i.device_id === d.id)) {
            toast.warning("الجهاز موجود في السلة");
            return;
        }
        setCart((prev) => [...prev, {
            device_id: d.id,
            name: `${d.brand} ${d.model}`,
            imei: d.imei,
            quantity: 1,
            unit_price: d.sale_price,
            total: d.sale_price,
            isDevice: true,
        }]);
    };

    const incItem = (idx) => {
        setCart((prev) => prev.map((i, j) => {
            if (j !== idx) return i;
            if (i.isDevice) return i;
            if (i.stock && i.quantity >= i.stock) {
                toast.error("لا توجد كمية إضافية");
                return i;
            }
            return { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unit_price };
        }));
    };
    const decItem = (idx) => {
        setCart((prev) => prev.map((i, j) => j === idx && i.quantity > 1 ? { ...i, quantity: i.quantity - 1, total: (i.quantity - 1) * i.unit_price } : i));
    };
    const removeItem = (idx) => setCart((prev) => prev.filter((_, j) => j !== idx));

    const subtotal = useMemo(() => cart.reduce((s, i) => s + i.total, 0), [cart]);
    const total = useMemo(() => Math.max(0, subtotal - Number(discount || 0)), [subtotal, discount]);
    const monthlyInstallment = useMemo(() => {
        if (paymentMethod !== "installment" || !months) return 0;
        const remaining = Math.max(0, total - Number(downPayment || 0));
        return remaining / months;
    }, [paymentMethod, total, downPayment, months]);

    const lookupCustomer = async () => {
        if (!customerPhone) return;
        try {
            const r = await api.get("/customers", { params: { search: customerPhone } });
            const found = r.data.find((c) => c.phone === customerPhone);
            if (found) {
                setCustomer(found);
                setCustomerName(found.name);
                toast.success("تم العثور على العميل: " + found.name);
            } else {
                setCustomer(null);
                toast.info("عميل جديد، سيتم إنشاؤه عند البيع");
            }
        } catch (err) {
            console.error("Customer lookup failed:", err);
        }
    };

    const submitSale = async () => {
        if (cart.length === 0) {
            toast.error("السلة فارغة");
            return;
        }
        if (paymentMethod === "installment" && (!customerName || !customerPhone)) {
            toast.error("يجب إدخال بيانات العميل للتقسيط");
            return;
        }
        setSubmitting(true);
        try {
            let customerId = customer?.id;
            if (!customerId && customerName && customerPhone) {
                const c = await api.post("/customers", { name: customerName, phone: customerPhone });
                customerId = c.data.id;
            }
            const paidAmount = paymentMethod === "installment" ? Number(downPayment || 0) : total;
            const payload = {
                items: cart.map((i) => ({
                    product_id: i.product_id,
                    device_id: i.device_id,
                    name: i.name,
                    imei: i.imei,
                    quantity: i.quantity,
                    unit_price: i.unit_price,
                    total: i.total,
                })),
                customer_id: customerId,
                customer_name: customerName || "",
                customer_phone: customerPhone || "",
                subtotal,
                discount: Number(discount || 0),
                tax: 0,
                total,
                payment_method: paymentMethod,
                paid_amount: paidAmount,
                notes: "",
                down_payment: paymentMethod === "installment" ? Number(downPayment || 0) : 0,
                monthly_installment: paymentMethod === "installment" ? monthlyInstallment : 0,
                months: paymentMethod === "installment" ? Number(months) : 0,
            };
            const r = await api.post("/sales", payload);
            toast.success("تم إتمام البيع بنجاح");
            setLastSale(r.data);
            // Reset cart
            setCart([]);
            setDiscount(0);
            setDownPayment(0);
            setCustomer(null);
            setCustomerName("");
            setCustomerPhone("");
            setPaymentMethod("cash");
            // Reload stock
            loadProducts(search);
            loadDevices(search);
        } catch (err) {
            toast.error(formatError(err?.response?.data?.detail) || "فشل إتمام البيع");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 fade-in" data-testid="pos-page">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Products / Devices grid (right side) */}
                <div className="md:col-span-8 bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex bg-slate-100 rounded-lg p-1">
                            <button
                                onClick={() => setTab("products")}
                                data-testid="pos-tab-products"
                                className={`px-4 py-2 rounded-md text-sm font-bold transition ${tab === "products" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600"}`}
                            >
                                <Package className="w-4 h-4 inline ml-1" />
                                المنتجات
                            </button>
                            <button
                                onClick={() => setTab("devices")}
                                data-testid="pos-tab-devices"
                                className={`px-4 py-2 rounded-md text-sm font-bold transition ${tab === "devices" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600"}`}
                            >
                                <Smartphone className="w-4 h-4 inline ml-1" />
                                الأجهزة
                            </button>
                        </div>
                        <div className="relative flex-1">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                data-testid="pos-search-input"
                                placeholder={tab === "products" ? "بحث بالاسم أو الباركود..." : "بحث بـ IMEI أو الموديل..."}
                                className="w-full h-12 pr-10 pl-4 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                        {tab === "products" && products.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => addProduct(p)}
                                data-testid={`product-card-${p.id}`}
                                className="bg-white border border-slate-200 rounded-xl p-4 text-right hover:border-blue-500 hover:shadow-md transition-all group"
                            >
                                <div className="text-xs text-slate-500 mb-1">{p.brand || p.category || "إكسسوار"}</div>
                                <div className="font-bold text-slate-900 mb-2 line-clamp-2">{p.name}</div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500">متبقي: {p.quantity}</span>
                                    <span className="text-blue-600 font-bold">{formatMoney(p.sale_price)} ر.س</span>
                                </div>
                            </button>
                        ))}
                        {tab === "devices" && devices.map((d) => (
                            <button
                                key={d.id}
                                onClick={() => addDevice(d)}
                                data-testid={`device-card-${d.id}`}
                                className="bg-white border border-slate-200 rounded-xl p-4 text-right hover:border-blue-500 hover:shadow-md transition-all"
                            >
                                <div className="text-xs text-slate-500 mb-1">{d.brand}</div>
                                <div className="font-bold text-slate-900 mb-1">{d.model}</div>
                                <div className="text-xs text-slate-600 mb-2">{d.storage} {d.color}</div>
                                <div className="text-[10px] text-slate-400 mb-2 truncate">IMEI: {d.imei}</div>
                                <div className="text-blue-600 font-bold">{formatMoney(d.sale_price)} ر.س</div>
                            </button>
                        ))}
                        {tab === "products" && products.length === 0 && (
                            <div className="col-span-full text-center text-slate-500 py-12">لا توجد منتجات</div>
                        )}
                        {tab === "devices" && devices.length === 0 && (
                            <div className="col-span-full text-center text-slate-500 py-12">لا توجد أجهزة متاحة</div>
                        )}
                    </div>
                </div>

                {/* Cart (left side) */}
                <div className="md:col-span-4 bg-white rounded-xl border border-slate-200 flex flex-col max-h-[calc(100vh-100px)]" data-testid="pos-cart">
                    <div className="p-5 border-b border-slate-200">
                        <div className="flex items-center gap-2 mb-4">
                            <ShoppingCart className="w-5 h-5 text-blue-600" />
                            <h2 className="text-lg font-bold text-slate-900">السلة ({cart.length})</h2>
                        </div>

                        <div className="space-y-2">
                            <input
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                onBlur={lookupCustomer}
                                data-testid="pos-customer-phone"
                                placeholder="هاتف العميل (اختياري)"
                                className="w-full h-10 px-3 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white outline-none text-sm"
                            />
                            <input
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                data-testid="pos-customer-name"
                                placeholder="اسم العميل"
                                className="w-full h-10 px-3 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white outline-none text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {cart.length === 0 && (
                            <div className="text-center text-slate-400 py-12">
                                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-40" />
                                السلة فارغة
                            </div>
                        )}
                        {cart.map((i, idx) => (
                            <div key={i.product_id || i.device_id} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm text-slate-900 truncate">{i.name}</div>
                                        {i.imei && <div className="text-[10px] text-slate-500">IMEI: {i.imei}</div>}
                                    </div>
                                    <button onClick={() => removeItem(idx)} data-testid={`cart-remove-${idx}`} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200">
                                        <button
                                            onClick={() => decItem(idx)}
                                            disabled={i.isDevice}
                                            className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 disabled:opacity-30"
                                        ><Minus className="w-3 h-3" /></button>
                                        <span className="w-8 text-center font-bold text-sm" data-testid={`cart-qty-${idx}`}>{i.quantity}</span>
                                        <button
                                            onClick={() => incItem(idx)}
                                            disabled={i.isDevice}
                                            className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 disabled:opacity-30"
                                        ><Plus className="w-3 h-3" /></button>
                                    </div>
                                    <div className="text-blue-600 font-bold text-sm">{formatMoney(i.total)} ر.س</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 border-t border-slate-200 space-y-3 bg-slate-50">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">الإجمالي:</span>
                            <span className="font-semibold">{formatMoney(subtotal)} ر.س</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-600 whitespace-nowrap">خصم:</label>
                            <input
                                type="number"
                                value={discount}
                                onChange={(e) => setDiscount(e.target.value)}
                                data-testid="pos-discount-input"
                                className="flex-1 h-9 px-3 rounded-lg bg-white border border-slate-300 text-sm outline-none focus:border-blue-500"
                            />
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                            <span className="font-bold text-slate-900">الإجمالي النهائي:</span>
                            <span className="text-2xl font-bold text-blue-600" data-testid="pos-total">{formatMoney(total)} ر.س</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { key: "cash", label: "كاش", icon: Banknote },
                                { key: "card", label: "بطاقة", icon: CreditCard },
                                { key: "installment", label: "تقسيط", icon: Calendar },
                            ].map((m) => {
                                const Icon = m.icon;
                                return (
                                    <button
                                        key={m.key}
                                        onClick={() => setPaymentMethod(m.key)}
                                        data-testid={`pos-payment-${m.key}`}
                                        className={`h-12 rounded-lg border-2 flex flex-col items-center justify-center text-xs font-semibold transition ${
                                            paymentMethod === m.key
                                                ? "bg-blue-600 border-blue-600 text-white"
                                                : "bg-white border-slate-200 text-slate-700 hover:border-blue-400"
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {m.label}
                                    </button>
                                );
                            })}
                        </div>

                        {paymentMethod === "installment" && (
                            <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-slate-700 whitespace-nowrap">دفعة أولى:</label>
                                    <input
                                        type="number"
                                        value={downPayment}
                                        onChange={(e) => setDownPayment(e.target.value)}
                                        data-testid="pos-down-payment"
                                        className="flex-1 h-9 px-3 rounded-lg bg-white border border-slate-300 text-sm outline-none"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-slate-700 whitespace-nowrap">عدد الأشهر:</label>
                                    <input
                                        type="number"
                                        value={months}
                                        onChange={(e) => setMonths(e.target.value)}
                                        data-testid="pos-months"
                                        className="flex-1 h-9 px-3 rounded-lg bg-white border border-slate-300 text-sm outline-none"
                                    />
                                </div>
                                <div className="text-center text-sm">
                                    <span className="text-slate-600">القسط الشهري: </span>
                                    <span className="font-bold text-blue-700">{formatMoney(monthlyInstallment)} ر.س</span>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={submitSale}
                            disabled={submitting || cart.length === 0}
                            data-testid="pos-submit-sale"
                            className="w-full h-14 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg disabled:opacity-50 transition"
                        >
                            {submitting ? "جارٍ الحفظ..." : "إتمام البيع"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Last sale modal */}
            {lastSale && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" data-testid="sale-success-modal">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 fade-in">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-emerald-600">تم البيع بنجاح ✓</h2>
                            <button onClick={() => setLastSale(null)} className="text-slate-500 hover:bg-slate-100 p-1 rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-2 mb-6 p-4 bg-slate-50 rounded-lg text-sm">
                            <div className="flex justify-between"><span className="text-slate-600">رقم الفاتورة:</span><span className="font-bold">{lastSale.invoice_number}</span></div>
                            <div className="flex justify-between"><span className="text-slate-600">الإجمالي:</span><span className="font-bold text-blue-600">{formatMoney(lastSale.total)} ر.س</span></div>
                            <div className="flex justify-between"><span className="text-slate-600">طريقة الدفع:</span><span>{PAYMENT_METHOD_LABELS[lastSale.payment_method]}</span></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => printInvoice(lastSale)}
                                data-testid="sale-print-button"
                                className="h-12 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2"
                            >
                                <Printer className="w-4 h-4" />
                                طباعة
                            </button>
                            <button
                                onClick={() => sendInvoiceViaWhatsApp(lastSale)}
                                data-testid="sale-whatsapp-button"
                                className="h-12 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold flex items-center justify-center gap-2"
                            >
                                <MessageCircle className="w-4 h-4" />
                                واتساب
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
