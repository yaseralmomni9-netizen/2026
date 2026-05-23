"""Devices (IMEI tracking) router."""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional
from auth import get_current_user, require_role
from models import DeviceCreate, DeviceOut, DeviceUpdate, new_id, utcnow_iso

router = APIRouter(prefix="/api/devices", tags=["devices"])


def _db(request: Request):
    return request.app.state.db


@router.get("", response_model=list[DeviceOut])
async def list_devices(request: Request, search: Optional[str] = None, status: Optional[str] = None, _: dict = Depends(get_current_user)):
    db = _db(request)
    q = {}
    if search:
        q["$or"] = [
            {"imei": {"$regex": search, "$options": "i"}},
            {"brand": {"$regex": search, "$options": "i"}},
            {"model": {"$regex": search, "$options": "i"}},
        ]
    if status:
        q["status"] = status
    items = await db.devices.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items


@router.post("", response_model=DeviceOut)
async def create_device(payload: DeviceCreate, request: Request, _: dict = Depends(require_role("admin", "sales"))):
    db = _db(request)
    if await db.devices.find_one({"imei": payload.imei}):
        raise HTTPException(400, "هذا الـ IMEI مسجل مسبقاً")
    doc = {
        "id": new_id(),
        **payload.model_dump(),
        "status": "available",
        "created_at": utcnow_iso(),
    }
    await db.devices.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/imei/{imei}", response_model=DeviceOut)
async def get_by_imei(imei: str, request: Request, _: dict = Depends(get_current_user)):
    db = _db(request)
    item = await db.devices.find_one({"imei": imei}, {"_id": 0})
    if not item:
        raise HTTPException(404, "الجهاز غير موجود")
    return item


@router.get("/{device_id}", response_model=DeviceOut)
async def get_device(device_id: str, request: Request, _: dict = Depends(get_current_user)):
    db = _db(request)
    item = await db.devices.find_one({"id": device_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "الجهاز غير موجود")
    return item


@router.put("/{device_id}", response_model=DeviceOut)
async def update_device(device_id: str, payload: DeviceUpdate, request: Request, _: dict = Depends(require_role("admin", "sales"))):
    db = _db(request)
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "لا توجد بيانات للتحديث")
    res = await db.devices.update_one({"id": device_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "الجهاز غير موجود")
    item = await db.devices.find_one({"id": device_id}, {"_id": 0})
    return item


@router.delete("/{device_id}")
async def delete_device(device_id: str, request: Request, _: dict = Depends(require_role("admin"))):
    db = _db(request)
    res = await db.devices.delete_one({"id": device_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "الجهاز غير موجود")
    return {"message": "تم الحذف"}
