"""Customers (CRM) router."""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional
from auth import get_current_user
from models import CustomerCreate, CustomerOut, new_id, utcnow_iso

router = APIRouter(prefix="/api/customers", tags=["customers"])


def _db(request: Request):
    return request.app.state.db


@router.get("", response_model=list[CustomerOut])
async def list_customers(request: Request, search: Optional[str] = None, _: dict = Depends(get_current_user)):
    db = _db(request)
    q = {}
    if search:
        q = {"$or": [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
        ]}
    items = await db.customers.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@router.post("", response_model=CustomerOut)
async def create_customer(payload: CustomerCreate, request: Request, _: dict = Depends(get_current_user)):
    db = _db(request)
    existing = await db.customers.find_one({"phone": payload.phone}, {"_id": 0})
    if existing:
        return existing
    doc = {
        "id": new_id(),
        **payload.model_dump(),
        "created_at": utcnow_iso(),
    }
    await db.customers.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/{customer_id}", response_model=CustomerOut)
async def get_customer(customer_id: str, request: Request, _: dict = Depends(get_current_user)):
    db = _db(request)
    item = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "العميل غير موجود")
    return item


@router.put("/{customer_id}", response_model=CustomerOut)
async def update_customer(customer_id: str, payload: CustomerCreate, request: Request, _: dict = Depends(get_current_user)):
    db = _db(request)
    res = await db.customers.update_one({"id": customer_id}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "العميل غير موجود")
    item = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    return item


@router.delete("/{customer_id}")
async def delete_customer(customer_id: str, request: Request, _: dict = Depends(get_current_user)):
    db = _db(request)
    res = await db.customers.delete_one({"id": customer_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "العميل غير موجود")
    return {"message": "تم الحذف"}


@router.get("/{customer_id}/history")
async def customer_history(customer_id: str, request: Request, _: dict = Depends(get_current_user)):
    db = _db(request)
    sales = await db.sales.find({"customer_id": customer_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    repairs = await db.repairs.find({"customer_id": customer_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"sales": sales, "repairs": repairs}
