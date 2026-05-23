# Mobile Shop Management System (نظام إدارة محلات الموبايلات)

## Problem Statement (Original - Arabic)
نظام إدارة متكامل لمحلات بيع وصيانة الأجهزة الخلوية يعمل كتطبيق ويب يمكن تحويله لسطح مكتب.
يدير: المبيعات، المخزون، أجهزة الموبايل (IMEI)، الصيانة، العملاء، التقارير، التقسيط والديون، المستخدمين والصلاحيات.

## Architecture
- **Backend:** FastAPI + MongoDB (motor async), JWT Bearer auth, UUID-based IDs
- **Frontend:** React 19 + React Router 7 + Tailwind + Shadcn UI + Sonner toasts, RTL Arabic
- **Auth:** JWT (Bearer in localStorage) + httpOnly cookie support
- **Fonts:** Tajawal (headings) + Cairo (body) via Google Fonts

## User Personas
1. **مدير (admin):** Full access — users, reports, all features
2. **موظف بيع (sales):** POS, products, devices, customers, repairs, installments
3. **موظف صيانة (repair):** Repairs and customers only

## Core Requirements (static)
- POS (Sales Screen) — fast checkout, barcode/name search, discount, cash/card/installment
- Inventory (Products & accessories) with min_quantity alerts
- IMEI tracking for devices — unique IMEI, status (available/sold/in_repair/reserved)
- Repair management — ticket numbers (RPR-XXXXXX), status flow (received → diagnosing → repaired → ready → delivered)
- Customer CRM with purchase + repair history
- Installments — down payment, monthly installments, payment tracking, overdue alerts
- Reports & Dashboard — daily/monthly sales, top products, low stock, debt overview
- Users & roles — admin/sales/repair

## What's been implemented (2026-02-21)
- ✅ JWT auth with role-based access (admin/sales/repair) + admin auto-seeding
- ✅ Products CRUD with low-stock filter
- ✅ Devices CRUD with IMEI uniqueness enforcement
- ✅ Customers CRUD with history endpoint
- ✅ Sales/POS with auto inventory decrement, device status flip, installment plan auto-creation
- ✅ Repairs with auto-generated ticket numbers, auto-customer creation, status updates
- ✅ Installments with payment tracking and overdue detection
- ✅ Dashboard endpoint with daily sales, top products, low stock, overdue debts
- ✅ Users management (admin only)
- ✅ Login page with Arabic RTL design
- ✅ Sidebar layout with role-based nav filtering
- ✅ POS page with product/device grid, cart, payment methods (cash/card/installment)
- ✅ Print invoices (browser print dialog, Arabic RTL template)
- ✅ WhatsApp share via wa.me links
- ✅ Repair ticket printing (auto-print on create)
- ✅ Reports page with date filtering
- ✅ Tested: Backend 100% (31/31), Frontend 100% (14/14)

## Prioritized Backlog

### P1 (next iteration)
- Barcode scanner integration (USB/Bluetooth scanner) for faster POS
- Excel/CSV import for bulk product/device addition
- Customer SMS/WhatsApp notification when repair status changes
- Stock movement history per product (in/out log)
- Daily cash drawer reconciliation

### P2 (future)
- Multi-shop / multi-branch support
- Offline mode (PWA + IndexedDB sync)
- Electron wrapper for Windows EXE export
- Real PDF generation (currently uses browser print)
- Receipt thermal printer support (ESC/POS)
- Profit margin reports & supplier management
- Backup/restore to cloud (Google Drive / S3)

### P3 (nice to have)
- Loyalty program / customer points
- Warranty tracking per device
- Spare parts inventory linked to repairs
- Technician performance reports
- Two-factor authentication for admin

## Test Credentials
- See `/app/memory/test_credentials.md`
- Admin: `admin@shop.com` / `admin123`
