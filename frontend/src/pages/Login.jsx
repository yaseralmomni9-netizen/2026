import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { formatError } from "../lib/api";
import { toast } from "sonner";
import { Smartphone, Lock, Mail, Loader2 } from "lucide-react";

export default function Login() {
    const { login, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    if (user) {
        return <Navigate to={location.state?.from?.pathname || "/"} replace />;
    }

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
            toast.success("تم تسجيل الدخول بنجاح");
            navigate(location.state?.from?.pathname || "/");
        } catch (err) {
            toast.error(formatError(err?.response?.data?.detail) || "فشل تسجيل الدخول");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex" dir="rtl" data-testid="login-page">
            {/* Brand side */}
            <div className="hidden md:flex md:w-1/2 gradient-bg text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 30%, white 0%, transparent 50%)" }} />
                <div className="relative z-10 flex flex-col justify-center items-start p-16">
                    <div className="bg-white/10 backdrop-blur rounded-2xl p-4 mb-8">
                        <Smartphone className="w-12 h-12" />
                    </div>
                    <h1 className="text-5xl font-bold mb-4 leading-tight">نظام إدارة محلات<br/>الموبايلات</h1>
                    <p className="text-lg text-blue-100 max-w-md">
                        إدارة شاملة للمبيعات، المخزون، أجهزة IMEI، الصيانة، العملاء والتقسيط في مكان واحد
                    </p>
                    <div className="mt-12 space-y-3 text-blue-100">
                        <div className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> نقطة بيع سريعة</div>
                        <div className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> تتبع IMEI كامل</div>
                        <div className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> إدارة الصيانة والتقسيط</div>
                    </div>
                </div>
            </div>

            {/* Form side */}
            <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-white">
                <form onSubmit={submit} className="w-full max-w-md space-y-6">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">مرحباً بعودتك</h2>
                        <p className="text-slate-500">سجل الدخول للوصول إلى لوحة التحكم</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">البريد الإلكتروني</label>
                        <div className="relative">
                            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                data-testid="login-email-input"
                                placeholder="admin@shop.com"
                                className="w-full h-12 px-10 rounded-lg bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 transition"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">كلمة المرور</label>
                        <div className="relative">
                            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                data-testid="login-password-input"
                                placeholder="••••••••"
                                className="w-full h-12 px-10 rounded-lg bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 transition"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        data-testid="login-submit-button"
                        className="w-full h-12 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                        تسجيل الدخول
                    </button>

                    <div className="text-center text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="font-semibold text-slate-700 mb-1">حساب تجريبي:</div>
                        <div>admin@shop.com / admin123</div>
                    </div>
                </form>
            </div>
        </div>
    );
}
