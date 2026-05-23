"""Reports & dashboard router."""
from fastapi import APIRouter, Depends, Request
from datetime import datetime, timezone, timedelta
from auth import get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _db(request: Request):
    return request.app.state.db


@router.get("/dashboard")
async def dashboard(request: Request, _: dict = Depends(get_current_user)):
    db = _db(request)
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    sales_today = await db.sales.find({"created_at": {"$gte": today_start}}, {"_id": 0}).to_list(1000)
    sales_month = await db.sales.find({"created_at": {"$gte": month_start}}, {"_id": 0}).to_list(5000)

    total_today = sum(s["total"] for s in sales_today)
    total_month = sum(s["total"] for s in sales_month)
    count_today = len(sales_today)
    count_month = len(sales_month)

    # Inventory
    products = await db.products.find({}, {"_id": 0}).to_list(2000)
    low_stock = [p for p in products if p.get("quantity", 0) <= p.get("min_quantity", 1)]
    total_inventory_value = sum((p.get("quantity", 0) * p.get("cost_price", 0)) for p in products)

    devices = await db.devices.find({}, {"_id": 0}).to_list(2000)
    devices_available = [d for d in devices if d.get("status") == "available"]

    # Repairs
    repairs_pending = await db.repairs.count_documents({"status": {"$in": ["received", "diagnosing", "repaired"]}})
    repairs_ready = await db.repairs.count_documents({"status": "ready"})

    # Installments
    installments = await db.installments.find({}, {"_id": 0}).to_list(1000)
    now_iso = now.isoformat()
    total_debt = sum(i.get("remaining", 0) for i in installments if i.get("status") != "completed")
    overdue = [i for i in installments if i.get("status") == "active" and i.get("next_due_date", "") < now_iso and i.get("remaining", 0) > 0]

    # Daily sales for last 7 days
    daily = []
    for i in range(6, -1, -1):
        day = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day + timedelta(days=1)
        day_sales = await db.sales.find(
            {"created_at": {"$gte": day.isoformat(), "$lt": day_end.isoformat()}}, {"_id": 0, "total": 1}
        ).to_list(1000)
        daily.append({
            "date": day.strftime("%Y-%m-%d"),
            "label": day.strftime("%a %d"),
            "total": sum(s["total"] for s in day_sales),
            "count": len(day_sales),
        })

    # Top products
    product_sales = {}
    for s in sales_month:
        for it in s.get("items", []):
            key = it.get("name", "غير معروف")
            product_sales[key] = product_sales.get(key, 0) + it.get("quantity", 0)
    top_products = sorted(product_sales.items(), key=lambda x: -x[1])[:5]

    return {
        "sales": {
            "today": total_today,
            "today_count": count_today,
            "month": total_month,
            "month_count": count_month,
        },
        "inventory": {
            "total_products": len(products),
            "low_stock_count": len(low_stock),
            "low_stock_items": low_stock[:10],
            "total_value": total_inventory_value,
            "devices_total": len(devices),
            "devices_available": len(devices_available),
        },
        "repairs": {
            "pending": repairs_pending,
            "ready": repairs_ready,
        },
        "installments": {
            "total_debt": total_debt,
            "overdue_count": len(overdue),
            "overdue_items": overdue[:10],
        },
        "daily_sales": daily,
        "top_products": [{"name": k, "qty": v} for k, v in top_products],
    }
