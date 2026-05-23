import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// withCredentials enables sending httpOnly auth cookie cross-origin.
// Tokens are NOT stored in localStorage anymore (XSS-safe).
const api = axios.create({
    baseURL: API,
    withCredentials: true,
});

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err?.response?.status === 401) {
            if (!window.location.pathname.includes("/login")) {
                localStorage.removeItem("user");
                window.location.href = "/login";
            }
        }
        return Promise.reject(err);
    }
);

export function formatError(detail) {
    if (detail == null) return "حدث خطأ ما، حاول مرة أخرى";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail))
        return detail
            .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
            .join(" ");
    if (detail && typeof detail.msg === "string") return detail.msg;
    return String(detail);
}

export default api;
