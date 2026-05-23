"""Repairs (maintenance) router."""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional
from auth import get_current_user, require_role
from models import RepairCreate, RepairOut, RepairUpdate, new_id, utcnow_iso

router = APIRouter(prefix="/api/repairs", tags=["repairs"])


def _db(request: Request):
    return request.app.state.db


async def _next_ticket(db) -> str:
    counter = await db.counters.find_one_and_update(
        {"_id": "repair"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = (counter or {}).get("seq", 1)
    return f"RPR-{seq:06d}"


@router.get("", response_model=list[RepairOut])
async def list_repairs(request: Request, status: Optional[str] = None, search: Optional[str] = None, _: dict = Depends(get_current_user)):
    db = _db(request)
    q = {}
    if status:
        q["status"] = status
    if search:
        q["$or"] = [
            {"ticket_number": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"customer_phone": {"$regex": search, "$options": "i"}},
            {"imei": {"$regex": search, "$options": "i"}},
        ]
    items = await db.repairs.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@router.post("", response_model=RepairOut)
async def create_repair(payload: RepairCreate, request: Request, user: dict = Depends(get_current_user)):
    db = _db(request)
    ticket = await _next_ticket(db)
    doc = {
        "id": new_id(),
        "ticket_number": ticket,
        **payload.model_dump(),
        "final_cost": 0,
        "status": "received",
        "technician_id": None,
        "technician_name": "",
        "created_at": utcnow_iso(),
        "updated_at": utcnow_iso(),
    }
    # Auto-create customer if phone given and not exists
    if payload.customer_phone and not payload.customer_id:
        existing = await db.customers.find_one({"phone": payload.customer_phone})
        if existing:
            doc["customer_id"] = existing["id"]
        else:
            cust_id = new_id()
            await db.customers.insert_one({
                "id": cust_id,
                "name": payload.customer_name,
                "phone": payload.customer_phone,
                "address": "",
                "notes": "",
                "created_at": utcnow_iso(),
            })
            doc["customer_id"] = cust_id
    await db.repairs.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/{repair_id}", response_model=RepairOut)
async def get_repair(repair_id: str, request: Request, _: dict = Depends(get_current_user)):
    db = _db(request)
    item = await db.repairs.find_one({"id": repair_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "تذكرة الصيانة غير موجودة")
    return item


@router.put("/{repair_id}", response_model=RepairOut)
async def update_repair(repair_id: str, payload: RepairUpdate, request: Request, user: dict = Depends(get_current_user)):
    db = _db(request)
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "لا توجد بيانات للتحديث")
    update["updated_at"] = utcnow_iso()
    if "status" in update and user.get("role") in ("admin", "repair"):
        update["technician_id"] = user["id"]
        update["technician_name"] = user["name"]
    res = await db.repairs.update_one({"id": repair_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "تذكرة الصيانة غير موجودة")
    item = await db.repairs.find_one({"id": repair_id}, {"_id": 0})
    return item


@router.delete("/{repair_id}")
async def delete_repair(repair_id: str, request: Request, _: dict = Depends(require_role("admin"))):
    db = _db(request)
    res = await db.repairs.delete_one({"id": repair_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "تذكرة الصيانة غير موجودة")
    return {"message": "تم الحذف"}
