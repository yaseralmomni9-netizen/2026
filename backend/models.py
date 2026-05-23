"""Pydantic models for the Mobile Shop Management System."""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Literal
from datetime import datetime, timezone
import uuid


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# ---------- Users ----------
Role = Literal["admin", "sales", "repair"]


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Role = "sales"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[Role] = None
    password: Optional[str] = None


# ---------- Customers ----------
class CustomerCreate(BaseModel):
    name: str
    phone: str
    address: Optional[str] = ""
    notes: Optional[str] = ""


class CustomerOut(CustomerCreate):
    id: str
    created_at: str


# ---------- Products ----------
ProductType = Literal["device", "accessory"]


class ProductCreate(BaseModel):
    name: str
    type: ProductType = "accessory"
    brand: Optional[str] = ""
    model: Optional[str] = ""
    storage: Optional[str] = ""
    color: Optional[str] = ""
    barcode: Optional[str] = ""
    cost_price: float = 0
    sale_price: float = 0
    quantity: int = 0
    min_quantity: int = 1
    category: Optional[str] = ""


class ProductOut(ProductCreate):
    id: str
    created_at: str


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[ProductType] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    storage: Optional[str] = None
    color: Optional[str] = None
    barcode: Optional[str] = None
    cost_price: Optional[float] = None
    sale_price: Optional[float] = None
    quantity: Optional[int] = None
    min_quantity: Optional[int] = None
    category: Optional[str] = None


# ---------- Devices (IMEI tracking) ----------
DeviceStatus = Literal["available", "sold", "in_repair", "reserved"]
DeviceCondition = Literal["new", "used", "refurbished"]


class DeviceCreate(BaseModel):
    imei: str
    brand: str
    model: str
    storage: Optional[str] = ""
    color: Optional[str] = ""
    condition: DeviceCondition = "new"
    cost_price: float = 0
    sale_price: float = 0
    notes: Optional[str] = ""


class DeviceOut(DeviceCreate):
    id: str
    status: DeviceStatus
    created_at: str


class DeviceUpdate(BaseModel):
    brand: Optional[str] = None
    model: Optional[str] = None
    storage: Optional[str] = None
    color: Optional[str] = None
    condition: Optional[DeviceCondition] = None
    cost_price: Optional[float] = None
    sale_price: Optional[float] = None
    status: Optional[DeviceStatus] = None
    notes: Optional[str] = None


# ---------- Sales (POS) ----------
PaymentMethod = Literal["cash", "card", "installment"]


class SaleItem(BaseModel):
    product_id: Optional[str] = None  # accessory/product id
    device_id: Optional[str] = None  # device id if device
    name: str
    imei: Optional[str] = None
    quantity: int = 1
    unit_price: float
    total: float


class SaleCreate(BaseModel):
    items: List[SaleItem]
    customer_id: Optional[str] = None
    customer_name: Optional[str] = ""
    customer_phone: Optional[str] = ""
    subtotal: float
    discount: float = 0
    tax: float = 0
    total: float
    payment_method: PaymentMethod = "cash"
    paid_amount: float = 0
    notes: Optional[str] = ""
    # Installment fields (used when payment_method == "installment")
    down_payment: Optional[float] = 0
    monthly_installment: Optional[float] = 0
    months: Optional[int] = 0


class SaleOut(BaseModel):
    id: str
    invoice_number: str
    items: List[SaleItem]
    customer_id: Optional[str] = None
    customer_name: Optional[str] = ""
    customer_phone: Optional[str] = ""
    subtotal: float
    discount: float
    tax: float
    total: float
    payment_method: str
    paid_amount: float
    notes: Optional[str] = ""
    cashier_id: str
    cashier_name: str
    created_at: str


# ---------- Repairs ----------
RepairStatus = Literal["received", "diagnosing", "repaired", "ready", "delivered", "cancelled"]


class RepairCreate(BaseModel):
    customer_id: Optional[str] = None
    customer_name: str
    customer_phone: str
    device_brand: str
    device_model: str
    imei: Optional[str] = ""
    problem: str
    device_condition: Optional[str] = ""
    accessories: Optional[str] = ""
    estimated_cost: float = 0
    notes: Optional[str] = ""


class RepairOut(BaseModel):
    id: str
    ticket_number: str
    customer_id: Optional[str] = None
    customer_name: str
    customer_phone: str
    device_brand: str
    device_model: str
    imei: Optional[str] = ""
    problem: str
    device_condition: Optional[str] = ""
    accessories: Optional[str] = ""
    estimated_cost: float
    final_cost: float = 0
    status: str
    notes: Optional[str] = ""
    technician_id: Optional[str] = None
    technician_name: Optional[str] = ""
    created_at: str
    updated_at: str


class RepairUpdate(BaseModel):
    status: Optional[RepairStatus] = None
    final_cost: Optional[float] = None
    notes: Optional[str] = None
    technician_id: Optional[str] = None
    technician_name: Optional[str] = None
    problem: Optional[str] = None


# ---------- Installments ----------
class InstallmentPaymentCreate(BaseModel):
    amount: float
    notes: Optional[str] = ""


class InstallmentPayment(BaseModel):
    id: str
    amount: float
    paid_at: str
    received_by: str
    notes: Optional[str] = ""


class InstallmentOut(BaseModel):
    id: str
    sale_id: str
    invoice_number: str
    customer_id: Optional[str] = None
    customer_name: str
    customer_phone: str
    total_amount: float
    down_payment: float
    monthly_installment: float
    months: int
    remaining: float
    payments: List[InstallmentPayment] = []
    next_due_date: Optional[str] = None
    status: str  # active, completed, overdue
    created_at: str
