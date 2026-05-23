import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Validate session via /auth/me using httpOnly cookie. No token in localStorage.
        let alive = true;
        api.get("/auth/me")
            .then((r) => {
                if (!alive) return;
                setUser(r.data);
                localStorage.setItem("user", JSON.stringify(r.data));
            })
            .catch((err) => {
                if (!alive) return;
                // 401 is expected on first visit; only log unexpected errors
                if (err?.response?.status && err.response.status !== 401) {
                    console.error("Auth check failed:", err);
                }
                localStorage.removeItem("user");
                setUser(null);
            })
            .finally(() => {
                if (alive) setLoading(false);
            });
        return () => {
            alive = false;
        };
    }, []);

    const login = async (email, password) => {
        const r = await api.post("/auth/login", { email, password });
        localStorage.setItem("user", JSON.stringify(r.data.user));
        setUser(r.data.user);
        return r.data.user;
    };

    const logout = async () => {
        try {
            await api.post("/auth/logout");
        } catch (err) {
            console.error("Logout API failed:", err);
        }
        localStorage.removeItem("user");
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
