import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ROLE_LABELS } from "../lib/utils";
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Smartphone,
    Wrench,
    Users,
    CreditCard,
    BarChart3,
    UserCog,
    LogOut,
} from "lucide-react";

const NAV = [
    { to: "/", label: "الرئيسية", icon: LayoutDashboard, roles: ["admin", "sales", "repair"] },
    { to: "/pos", label: "نقطة البيع", icon: ShoppingCart, roles: ["admin", "sales"] },
    { to: "/products", label: "المنتجات", icon: Package, roles: ["admin", "sales"] },
    { to: "/devices", label: "أجهزة IMEI", icon: Smartphone, roles: ["admin", "sales"] },
    { to: "/repairs", label: "الصيانة", icon: Wrench, roles: ["admin", "sales", "repair"] },
    { to: "/customers", label: "العملاء", icon: Users, roles: ["admin", "sales", "repair"] },
    { to: "/installments", label: "التقسيط", icon: CreditCard, roles: ["admin", "sales"] },
    { to: "/reports", label: "التقارير", icon: BarChart3, roles: ["admin"] },
    { to: "/users", label: "المستخدمين", icon: UserCog, roles: ["admin"] },
];

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    const allowed = NAV.filter((n) => user?.role === "admin" || n.roles.includes(user?.role));

    return (
        <div className="min-h-screen flex bg-slate-50" dir="rtl">
            {/* Sidebar (fixed right) */}
            <aside className="fixed right-0 top-0 h-full w-64 bg-white border-l border-slate-200 flex flex-col z-30" data-testid="sidebar">
                <div className="p-6 border-b border-slate-200">
                    <h1 className="text-xl font-bold text-slate-900">نظام إدارة المحل</h1>
                    <p className="text-xs text-slate-500 mt-1">Mobile Shop System</p>
                </div>
                <nav className="flex-1 p-4 overflow-y-auto space-y-1">
                    {allowed.map((n) => {
                        const Icon = n.icon;
                        return (
                            <NavLink
                                key={n.to}
                                to={n.to}
                                end={n.to === "/"}
                                data-testid={`nav-${n.to.replace("/", "") || "home"}`}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                        isActive
                                            ? "bg-blue-600 text-white shadow-sm"
                                            : "text-slate-700 hover:bg-slate-100"
                                    }`
                                }
                            >
                                <Icon className="w-5 h-5" />
                                <span>{n.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>
                <div className="p-4 pb-20 border-t border-slate-200">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                            {user?.name?.charAt(0) || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-slate-900 truncate" data-testid="current-user-name">{user?.name}</div>
                            <div className="text-xs text-slate-500">{ROLE_LABELS[user?.role] || user?.role}</div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        data-testid="logout-button"
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        تسجيل الخروج
                    </button>
                </div>
            </aside>

            {/* Main content with right padding for sidebar */}
            <main className="flex-1 mr-64 min-h-screen">
                <Outlet />
            </main>
        </div>
    );
}
