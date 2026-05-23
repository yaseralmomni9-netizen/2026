"""Installments / debt tracking router."""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional
from datetime import datetime, timezone, timedelta
from auth import get_current_user
from models import InstallmentOut, InstallmentPaymentCreate, new_id, utcnow_iso

router = APIRouter(prefix="/api/installments", tags=["installments"])


def _db(request: Request):
    return request.app.state.db


@router.get("", response_model=list[InstallmentOut])
async def list_installments(request: Request, status: Optional[str] = None, _: dict = Depends(get_current_user)):
    db = _db(request)
    q = {}
    if status:
        q["status"] = status
    items = await db.installments.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    # Mark overdue
    now = datetime.now(timezone.utc).isoformat()
    for it in items:
        if it["status"] == "active" and it.get("next_due_date") and it["next_due_date"] < now and it["remaining"] > 0:
            it["status"] = "overdue"
    return items


@router.get("/{inst_id}", response_model=InstallmentOut)
async def get_installment(inst_id: str, request: Request, _: dict = Depends(get_current_user)):
    db = _db(request)
    item = await db.installments.find_one({"id": inst_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "خطة التقسيط غير موجودة")
    return item


@router.post("/{inst_id}/pay", response_model=InstallmentOut)
async def add_payment(inst_id: str, payload: InstallmentPaymentCreate, request: Request, user: dict = Depends(get_current_user)):
    db = _db(request)
    inst = await db.installments.find_one({"id": inst_id})
    if not inst:
        raise HTTPException(404, "خطة التقسيط غير موجودة")
    if payload.amount <= 0:
        raise HTTPException(400, "المبلغ يجب أن يكون أكبر من صفر")
    payment = {
        "id": new_id(),
        "amount": payload.amount,
        "paid_at": utcnow_iso(),
        "received_by": user["name"],
        "notes": payload.notes or "",
    }
    new_remaining = max(0, inst["remaining"] - payload.amount)
    new_status = "completed" if new_remaining == 0 else "active"
    next_due = inst.get("next_due_date")
    if new_status == "active":
        next_due = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    await db.installments.update_one(
        {"id": inst_id},
        {"$push": {"payments": payment}, "$set": {"remaining": new_remaining, "status": new_status, "next_due_date": next_due}},
    )
    return await db.installments.find_one({"id": inst_id}, {"_id": 0})
