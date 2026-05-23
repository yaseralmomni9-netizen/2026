"""Mobile Shop Management System - Main FastAPI server."""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
from datetime import datetime, timezone

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_role,
)
from models import (
    UserCreate,
    UserLogin,
    UserOut,
    UserUpdate,
    new_id,
    utcnow_iso,
)
from routers import customers, products, devices, sales, repairs, installments, reports

# MongoDB connection
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Mobile Shop Management System")
app.state.db = db

api_router = APIRouter(prefix="/api")


# ---------------- Auth Endpoints ----------------
@api_router.post("/auth/login")
async def login(payload: UserLogin, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="البريد الإلكتروني أو كلمة المرور غير صحيحة")
    token = create_access_token(user["id"], user["email"], user["role"])
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=12 * 3600,
        path="/",
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
        },
    }


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"message": "تم تسجيل الخروج"}


@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return UserOut(**user)


# ---------------- Users Management (admin only) ----------------
@api_router.get("/users", response_model=list[UserOut])
async def list_users(_: dict = Depends(require_role("admin"))):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    return users


@api_router.post("/users", response_model=UserOut)
async def create_user(payload: UserCreate, _: dict = Depends(require_role("admin"))):
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="هذا البريد مستخدم مسبقاً")
    user_doc = {
        "id": new_id(),
        "email": email,
        "name": payload.name,
        "role": payload.role,
        "password_hash": hash_password(payload.password),
        "created_at": utcnow_iso(),
    }
    await db.users.insert_one(user_doc)
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    return user_doc


@api_router.put("/users/{user_id}", response_model=UserOut)
async def update_user(user_id: str, payload: UserUpdate, _: dict = Depends(require_role("admin"))):
    update_doc = {}
    if payload.name is not None:
        update_doc["name"] = payload.name
    if payload.role is not None:
        update_doc["role"] = payload.role
    if payload.password:
        update_doc["password_hash"] = hash_password(payload.password)
    if not update_doc:
        raise HTTPException(status_code=400, detail="لا توجد بيانات للتحديث")
    res = await db.users.update_one({"id": user_id}, {"$set": update_doc})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return user


@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current: dict = Depends(require_role("admin"))):
    if user_id == current["id"]:
        raise HTTPException(status_code=400, detail="لا يمكنك حذف حسابك")
    res = await db.users.delete_one({"id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    return {"message": "تم الحذف"}


# Include all routers
app.include_router(api_router)
app.include_router(customers.router)
app.include_router(products.router)
app.include_router(devices.router)
app.include_router(sales.router)
app.include_router(repairs.router)
app.include_router(installments.router)
app.include_router(reports.router)

# CORS - explicit origins required because allow_credentials=True is incompatible with "*"
_cors_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins or ["*"],
    allow_credentials=bool(_cors_origins),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.products.create_index("id", unique=True)
    await db.products.create_index("barcode")
    await db.devices.create_index("id", unique=True)
    await db.devices.create_index("imei", unique=True)
    await db.customers.create_index("id", unique=True)
    await db.customers.create_index("phone")
    await db.sales.create_index("id", unique=True)
    await db.sales.create_index("invoice_number", unique=True)
    await db.repairs.create_index("id", unique=True)
    await db.repairs.create_index("ticket_number", unique=True)
    await db.installments.create_index("id", unique=True)

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@shop.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": new_id(),
            "email": admin_email,
            "name": "المدير العام",
            "role": "admin",
            "password_hash": hash_password(admin_password),
            "created_at": utcnow_iso(),
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )
        logger.info("Admin password updated from env")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


@api_router.get("/")
async def root():
    return {"message": "Mobile Shop Management System API", "version": "1.0"}

# --- الإضافة الجديدة والذكية للإقلاع التلقائي على منصة Render ---
if __name__ == "__main__":
    import uvicorn
    # قراءة البورت ديناميكياً وإذا لم يتوفر يتم التشغيل على المنفذ الافتراضي لـ Render
    port_number = int(os.environ.get("PORT", 10000))
    uvicorn.run("server:app", host="0.0.0.0", port=port_number)
