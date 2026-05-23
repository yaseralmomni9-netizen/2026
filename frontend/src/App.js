import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import POS from "@/pages/POS";
import Products from "@/pages/Products";
import Devices from "@/pages/Devices";
import Repairs from "@/pages/Repairs";
import Customers from "@/pages/Customers";
import Installments from "@/pages/Installments";
import Reports from "@/pages/Reports";
import Users from "@/pages/Users";

function App() {
    return (
        <div className="App" dir="rtl">
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route
                            element={
                                <ProtectedRoute>
                                    <Layout />
                                </ProtectedRoute>
                            }
                        >
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/pos" element={<ProtectedRoute roles={["admin", "sales"]}><POS /></ProtectedRoute>} />
                            <Route path="/products" element={<ProtectedRoute roles={["admin", "sales"]}><Products /></ProtectedRoute>} />
                            <Route path="/devices" element={<ProtectedRoute roles={["admin", "sales"]}><Devices /></ProtectedRoute>} />
                            <Route path="/repairs" element={<Repairs />} />
                            <Route path="/customers" element={<Customers />} />
                            <Route path="/installments" element={<ProtectedRoute roles={["admin", "sales"]}><Installments /></ProtectedRoute>} />
                            <Route path="/reports" element={<ProtectedRoute roles={["admin"]}><Reports /></ProtectedRoute>} />
                            <Route path="/users" element={<ProtectedRoute roles={["admin"]}><Users /></ProtectedRoute>} />
                        </Route>
                    </Routes>
                </BrowserRouter>
                <Toaster position="top-center" richColors closeButton dir="rtl" />
            </AuthProvider>
        </div>
    );
}

export default App;
