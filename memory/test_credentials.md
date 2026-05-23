# Mobile Shop Management System - Test Credentials

## Admin Account (auto-seeded on startup)
- **Email:** admin@shop.com
- **Password:** admin123
- **Role:** admin (المدير)
- **Name:** المدير العام

## Auth Endpoints
- POST `/api/auth/login` — login (returns JWT in body + access_token cookie)
- POST `/api/auth/logout` — logout
- GET `/api/auth/me` — get current user

## Auth Method
- JWT stored in **httpOnly Secure SameSite=None cookie** named `access_token`
- Frontend uses `axios` with `withCredentials: true` — cookie sent automatically
- localStorage stores **only user info** (name/role/email/id) for UI, NOT the token
- Backend reads cookie OR `Authorization: Bearer <token>` header (both supported)

## User Management (admin only)
- GET `/api/users`
- POST `/api/users` (body: email, password, name, role)
- PUT `/api/users/{id}`
- DELETE `/api/users/{id}`

## Roles available
- `admin` (مدير) - full access
- `sales` (موظف بيع) - POS, products, devices, customers, repairs, installments
- `repair` (موظف صيانة) - repairs, customers only
