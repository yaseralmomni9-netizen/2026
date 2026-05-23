import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function formatMoney(n) {
    const num = Number(n || 0);
    return num.toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(iso) {
    if (!iso) return "-";
    try {
        const d = new Date(iso);
        return d.toLocaleDateString("ar-EG", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch {
        return iso;
    }
}

export function formatDateTime(iso) {
    if (!iso) return "-";
    try {
        const d = new Date(iso);
        return d.toLocaleString("ar-EG", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return iso;
    }
}

export const ROLE_LABELS = {
    admin: "مدير",
    sales: "موظف بيع",
    repair: "موظف صيانة",
};

export const REPAIR_STATUS_LABELS = {
    received: "تم الاستلام",
    diagnosing: "قيد الفحص",
    repaired: "تم الإصلاح",
    ready: "جاهز للاستلام",
    delivered: "تم التسليم",
    cancelled: "ملغية",
};

export const REPAIR_STATUS_COLORS = {
    received: "bg-blue-100 text-blue-800",
    diagnosing: "bg-amber-100 text-amber-800",
    repaired: "bg-emerald-100 text-emerald-800",
    ready: "bg-green-100 text-green-800",
    delivered: "bg-slate-200 text-slate-700",
    cancelled: "bg-red-100 text-red-800",
};

export const DEVICE_STATUS_LABELS = {
    available: "متوفر",
    sold: "تم بيعه",
    in_repair: "في الصيانة",
    reserved: "محجوز",
};

export const DEVICE_STATUS_COLORS = {
    available: "bg-emerald-100 text-emerald-800",
    sold: "bg-slate-200 text-slate-700",
    in_repair: "bg-amber-100 text-amber-800",
    reserved: "bg-blue-100 text-blue-800",
};

export const PAYMENT_METHOD_LABELS = {
    cash: "كاش",
    card: "بطاقة",
    installment: "تقسيط",
};
