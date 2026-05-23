"""Sales (POS / Invoices) router."""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional
from datetime import datetime, timezone, timedelta
from auth import get_current_user
from models import SaleCreate, SaleOut, new_id, utcnow_iso

router = APIRouter(prefix="/api/sales", tags=["sales"])


def _db(request: Request):
    return request.app.state.db


async def _next_invoice_number(db) -> str:
    counter = await db.counters.find_one_and_update(
        {"_id": "invoice"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = (counter or {}).get("seq", 1)
    return f"INV-{seq:06d}"


@router.get("", response_model=list[SaleOut])
async def list_sales(request: Request, customer_id: Optional[str] = None, _: dict = Depends(get_current_user)):
    db = _db(request)
    q = {}
    if customer_id:
        q["customer_id"] = customer_id
    items = await db.sales.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@router.post("", response_model=SaleOut)
async def create_sale(payload: SaleCreate, request: Request, user: dict = Depends(get_current_user)):
    db = _db(request)
    invoice_number = await _next_invoice_number(db)
    sale_id = new_id()

    # Update inventory & device status
    for item in payload.items:
        if item.product_id:
            res = await db.products.find_one({"id": item.product_id})
            if res:
                if res.get("quantity", 0) < item.quantity:
                    raise HTTPException(400, f"الكمية غير متوفرة للمنتج: {item.name}")
                await db.products.update_one(
                    {"id": item.product_id},
                    {"$inc": {"quantity": -item.quantity}},
                )
        if item.device_id:
            dev = await db.devices.find_one({"id": item.device_id})
            if not dev:
                raise HTTPException(400, f"الجهاز غير موجود: {item.name}")
            if dev.get("status") != "available":
                raise HTTPException(400, f"الجهاز غير متاح للبيع: {item.imei}")
            await db.devices.update_one(
                {"id": item.device_id},
                {"$set": {"status": "sold"}},
            )

    sale_doc = {
        "id": sale_id,
        "invoice_number": invoice_number,
        "items": [i.model_dump() for i in payload.items],
        "customer_id": payload.customer_id,
        "customer_name": payload.customer_name or "",
        "customer_phone": payload.customer_phone or "",
        "subtotal": payload.subtotal,
        "discount": payload.discount,
        "tax": payload.tax,
        "total": payload.total,
        "payment_method": payload.payment_method,
        "paid_amount": payload.paid_amount,
        "notes": payload.notes or "",
        "cashier_id": user["id"],
        "cashier_name": user["name"],
        "created_at": utcnow_iso(),
    }
    await db.sales.insert_one(sale_doc)
    sale_doc.pop("_id", None)

    # If installment, create installment plan
    if payload.payment_method == "installment" and payload.months and payload.months > 0:
        next_due = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        inst_doc = {
            "id": new_id(),
            "sale_id": sale_id,
            "invoice_number": invoice_number,
            "customer_id": payload.customer_id,
            "customer_name": payload.customer_name or "",
            "customer_phone": payload.customer_phone or "",
            "total_amount": payload.total,
            "down_payment": payload.down_payment or 0,
            "monthly_installment": payload.monthly_installment or 0,
            "months": payload.months,
            "remaining": payload.total - (payload.down_payment or 0),
            "payments": [],
            "next_due_date": next_due,
            "status": "active",
            "created_at": utcnow_iso(),
        }
        await db.installments.insert_one(inst_doc)

    return sale_doc


@router.get("/{sale_id}", response_model=SaleOut)
async def get_sale(sale_id: str, request: Request, _: dict = Depends(get_current_user)):
    db = _db(request)
    item = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "الفاتورة غير موجودة")
    return item
