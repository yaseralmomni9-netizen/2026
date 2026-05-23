"""Products & inventory router."""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional
from auth import get_current_user, require_role
from models import ProductCreate, ProductOut, ProductUpdate, new_id, utcnow_iso

router = APIRouter(prefix="/api/products", tags=["products"])


def _db(request: Request):
    return request.app.state.db


@router.get("", response_model=list[ProductOut])
async def list_products(request: Request, search: Optional[str] = None, low_stock: bool = False, _: dict = Depends(get_current_user)):
    db = _db(request)
    q = {}
    if search:
        q["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"barcode": {"$regex": search, "$options": "i"}},
            {"brand": {"$regex": search, "$options": "i"}},
            {"model": {"$regex": search, "$options": "i"}},
        ]
    items = await db.products.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    if low_stock:
        items = [p for p in items if p.get("quantity", 0) <= p.get("min_quantity", 1)]
    return items


@router.post("", response_model=ProductOut)
async def create_product(payload: ProductCreate, request: Request, _: dict = Depends(require_role("admin", "sales"))):
    db = _db(request)
    doc = {
        "id": new_id(),
        **payload.model_dump(),
        "created_at": utcnow_iso(),
    }
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/barcode/{code}", response_model=ProductOut)
async def get_by_barcode(code: str, request: Request, _: dict = Depends(get_current_user)):
    db = _db(request)
    item = await db.products.find_one({"barcode": code}, {"_id": 0})
    if not item:
        raise HTTPException(404, "المنتج غير موجود")
    return item


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: str, request: Request, _: dict = Depends(get_current_user)):
    db = _db(request)
    item = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "المنتج غير موجود")
    return item


@router.put("/{product_id}", response_model=ProductOut)
async def update_product(product_id: str, payload: ProductUpdate, request: Request, _: dict = Depends(require_role("admin", "sales"))):
    db = _db(request)
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "لا توجد بيانات للتحديث")
    res = await db.products.update_one({"id": product_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "المنتج غير موجود")
    item = await db.products.find_one({"id": product_id}, {"_id": 0})
    return item


@router.delete("/{product_id}")
async def delete_product(product_id: str, request: Request, _: dict = Depends(require_role("admin"))):
    db = _db(request)
    res = await db.products.delete_one({"id": product_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "المنتج غير موجود")
    return {"message": "تم الحذف"}
