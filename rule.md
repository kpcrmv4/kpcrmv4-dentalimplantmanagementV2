# Dental Implant Management V2 — Development Plan

## Project Overview
ระบบจัดการคลังวัสดุและเคสรากฟันเทียม (Dental Implant Management System)
Tech Stack: Next.js 15+ (App Router) / Supabase (PostgreSQL + Auth + Realtime) / Tailwind CSS + shadcn/ui

---

## Phase Summary

| Phase | รายการ | สถานะ | ไฟล์หลัก |
|-------|--------|-------|---------|
| 1 | Quick Wins (ลบ field ไม่จำเป็น, เพิ่มชื่อหมอ, คนไข้กดได้) | ✅ Done | cases/new, cases/page, patients/page, patients/[id] |
| 2 | Dashboard กดได้ + จำนวนตรง | ✅ Done | traffic-light-stats.tsx |
| 3 | Stock Filters + Master Data (DB + Server Actions) | ✅ Done | migrations 010-013, settings.ts, borrows.ts, line.ts |
| 4 | Admin User CRUD + Reset Password | ✅ Done | admin/users/page, users.ts, service.ts |
| 5 | คลังสินค้า — ยืม/แลกของ | ✅ Done | inventory/borrows/*, borrows.ts |
| N | LINE Messaging API + Notification Preferences | ✅ Done | notifications.ts, line.ts, migrations/013 |

---

## Phase 1: Quick Wins

### 1.1 ลบ field ผู้ช่วยทันตแพทย์ + ราคาเคส
- **ไฟล์**: `app/(dashboard)/cases/new/page.tsx`
- ลบ `getAssistants` import, `assistantId` state, assistant Select field, price_to_patient Input
- **ไฟล์**: `lib/actions/cases.ts`
- ลบ `assistant_id`, `price_to_patient` จาก createCase insert

### 1.2 อัปเดตประเภทหัตถการ
- **ไฟล์**: `supabase/migrations/010_update_procedure_types.sql`
- ค่าใหม่: ฝังรากเทียม, ฝังรากเทียม + ปลูกกระดูก, Second stage surgery, พิมพ์ปากรากเทียม, ใส่ฟันรากเทียม, ปลูกกระดูก, ผ่าตัดเหงือก
- ลูกค้าแก้ไขเพิ่มเติมได้ผ่านหน้า Settings (มี UI อยู่แล้ว)

### 1.3 แสดงชื่อหมอในรายชื่อเคส
- **ไฟล์**: `app/(dashboard)/cases/page.tsx`
- เพิ่ม `users!cases_dentist_id_fkey(full_name)` ใน query
- แสดง `ทพ. {dentist.full_name}` ทั้ง timeline view และ list view

### 1.4 หน้าคนไข้กดเข้าดูได้
- **ไฟล์**: `app/(dashboard)/patients/page.tsx` — wrap Card ด้วย Link
- **ไฟล์ใหม่**: `app/(dashboard)/patients/[id]/page.tsx` — patient detail + ประวัติเคส + ปุ่มสร้างเคส

---

## Phase 2: Dashboard ปรับปรุง

### 2.1 กล่องกดเข้าไปดูเคสได้
- **ไฟล์**: `components/dashboard/traffic-light-stats.tsx`
- เพิ่ม `href` prop ให้ SummaryCard / MaterialCard → wrap ด้วย `<Link>`
- ลิงก์ไปหน้า `/cases?period=month&status=X` หรือ `&appt=X`

### 2.2 จำนวนตรงกับ unready panel
- เพิ่ม case_status breakdown row: "รอสั่งของ" (pending_order), "รอจัดของ" (pending_preparation)
- แสดงใต้ Material Readiness cards

---

## Phase 3: Stock Attributes + Master Data

### 3.1 Database Schema
- **Migration 011**: เพิ่ม `model`, `diameter`, `length` columns ใน products
- สร้าง `brands` + `product_models` lookup tables พร้อม RLS

### 3.2 Server Actions
- **ไฟล์**: `lib/actions/settings.ts`
- เพิ่ม CRUD: `getBrands`, `addBrand`, `updateBrand`, `deleteBrand`
- เพิ่ม CRUD: `getProductModels`, `addProductModel`, `updateProductModel`, `deleteProductModel`
- เพิ่ม: `getNotificationSettings`, `updateNotificationSetting`
- เพิ่ม: `updateLineSettings`, `getLineSettings`

### 3.3 Stock Filter UI (TODO — ยังเหลือ)
- **ไฟล์**: `app/(dashboard)/inventory/inventory-search.tsx`
- เพิ่ม dropdown filters: ประเภท (product_categories), ยี่ห้อ (brands), diameter range, length range
- **ไฟล์**: `app/(dashboard)/inventory/page.tsx` — ส่ง filter params

### 3.4 Product Form Fields (TODO — ยังเหลือ)
- **ไฟล์**: `app/(dashboard)/inventory/products/new/page.tsx`
- เพิ่ม fields: model, diameter, length
- **ไฟล์**: `app/(dashboard)/inventory/products/[id]/product-detail-client.tsx`
- แสดง/แก้ไข fields ใหม่

---

## Phase 4: Admin User Management

### 4.1 CRUD + Reset Password
- **ไฟล์**: `app/(dashboard)/admin/users/page.tsx`
- ปุ่ม "เพิ่มผู้ใช้" → Modal: email, password, ชื่อ, บทบาท
- ปุ่ม "แก้ไข" → Modal: ชื่อ, เบอร์โทร
- ปุ่ม "รีเซ็ตรหัสผ่าน" → Modal: รหัสใหม่
- ปุ่ม "ลบ" → Confirm + soft delete

### 4.2 Service Role Client
- **ไฟล์ใหม่**: `lib/supabase/service.ts`
- ใช้ `SUPABASE_SERVICE_ROLE_KEY` สำหรับ admin operations (createUser, updateUserById)

### 4.3 Server Actions
- **ไฟล์**: `lib/actions/users.ts`
- เพิ่ม: `createUser`, `updateUserProfile`, `resetUserPassword`, `deleteUser`

---

## Phase 5: คลังสินค้า — ยืม/แลกของ

### 5.1 Database Schema
- **Migration 012**: `inventory_borrows`, `inventory_borrow_items`, `inventory_borrow_photos`
- Enums: `borrow_status` (borrowed/returned/exchanged/paid/partially_returned), `borrow_source` (clinic/supplier)

### 5.2 Server Actions
- **ไฟล์ใหม่**: `lib/actions/borrows.ts`
- `getBorrows`, `getBorrowById`, `createBorrow` (เพิ่มเข้า stock เหมือน PO), `settleBorrowItem`, `uploadBorrowPhoto`

### 5.3 UI Pages
- `app/(dashboard)/inventory/borrows/page.tsx` — รายการยืม + filter สถานะ
- `app/(dashboard)/inventory/borrows/new/page.tsx` — สร้างรายการยืมใหม่
- `app/(dashboard)/inventory/borrows/[id]/page.tsx` — รายละเอียด + รูปหลักฐาน

---

## Phase N: LINE Messaging API + Notification Preferences

### N.1 Database Schema
- **Migration 013**: `notification_settings` table + seed defaults + LINE config ใน `app_settings`

### N.2 LINE API Integration
- **ไฟล์ใหม่**: `lib/actions/line.ts`
- `sendLineMessage`, `sendLineFlexMessage`, `sendLineToRoles`, `testLineConnection`
- ใช้ LINE Messaging API v2 push endpoint

### N.3 Enhanced Notification Engine
- **ไฟล์**: `lib/actions/notifications.ts`
- `createNotification` — ดึง settings จาก `notification_settings`, ส่ง in-app/LINE/Discord ตาม config
- รับ `overrides` parameter เพื่อให้หน้างาน override default ได้
- `smartNotify` — ส่งถึง users ตาม target_roles จาก settings

### N.4 Admin Settings UI (TODO — ยังเหลือ)
- **ไฟล์**: `app/(dashboard)/settings/page.tsx`
- เพิ่ม section: LINE Messaging API config (token, secret, enable/disable, test button)
- เพิ่ม section: Notification Preferences table (event type × channel toggles)
- เพิ่ม section: Brands management
- เพิ่ม section: Product Models management

### N.5 Notification Triggers (TODO — ยังเหลือ)
| Action | Event Type | ไฟล์ |
|--------|-----------|------|
| สร้างเคสใหม่ | `case_assigned` | `lib/actions/cases.ts` → `createCase()` |
| สร้าง PO | `po_created` | `lib/actions/orders.ts` → `createPurchaseOrder()` |
| อนุมัติ PO | `po_approved` | `lib/actions/orders.ts` → `updatePOStatus()` |
| จัดของเสร็จ | `material_prepared` | `lib/actions/cases.ts` → `markCaseReady()` |
| สต็อกต่ำ | `low_stock` | Cron job or after receiveGoods |
| สินค้าหมด | `out_of_stock` | Cron job or after receiveGoods |
| วัสดุใกล้หมดอายุ | `expiring_soon` | Cron job |

---

## Remaining TODO Items

### High Priority
1. [ ] **Settings UI**: เพิ่ม sections ใน settings page สำหรับ LINE config, notification preferences, brands, models
2. [ ] **Stock Filter UI**: เพิ่ม dropdown filters ใน inventory search (ประเภท/ยี่ห้อ/diameter/length)
3. [ ] **Product Form**: เพิ่ม fields model, diameter, length ในหน้าสร้าง/แก้ไขสินค้า
4. [ ] **Notification Triggers**: เพิ่ม `smartNotify()` calls ในจุดสำคัญ (createCase, createPO, markCaseReady)

### Medium Priority
5. [ ] **Borrow Settlement UI**: เพิ่มปุ่มคืน/แลก/ชำระ ในหน้า borrow detail
6. [ ] **Borrow Photo Upload**: เพิ่ม UI upload รูปหลักฐานในหน้า borrow detail
7. [ ] **Navigation**: เพิ่มลิงก์ "ยืม/แลกของ" ใน sidebar/menu
8. [ ] **Cron Jobs**: สร้าง API route สำหรับ check low stock + expiring alerts

### Low Priority
9. [ ] **LINE Login**: เพิ่ม LINE Login สำหรับ auto-link LINE User ID
10. [ ] **Web Push**: Implement VAPID web push notifications
11. [ ] **Stock Filter by brand from brands table**: ปรับ brand field ใน products ให้ reference brands table

---

## File Structure Summary

```
app/
├── (dashboard)/
│   ├── dashboard/page.tsx           # Main dashboard
│   ├── cases/
│   │   ├── page.tsx                 # Case list (+ dentist name)
│   │   ├── new/page.tsx             # New case (no assistant/price)
│   │   └── [id]/page.tsx            # Case detail
│   ├── patients/
│   │   ├── page.tsx                 # Patient list (clickable)
│   │   ├── new/page.tsx             # New patient
│   │   └── [id]/page.tsx            # ✨ Patient detail + case history
│   ├── inventory/
│   │   ├── page.tsx                 # Stock page
│   │   ├── inventory-search.tsx     # Search + filters
│   │   ├── products/new/page.tsx    # New product
│   │   └── borrows/                 # ✨ New section
│   │       ├── page.tsx             # Borrow list
│   │       ├── new/page.tsx         # Create borrow
│   │       └── [id]/page.tsx        # Borrow detail
│   ├── admin/users/page.tsx         # ✨ User CRUD + reset password
│   └── settings/page.tsx            # Settings (needs LINE/notification UI)
├── components/
│   └── dashboard/
│       └── traffic-light-stats.tsx  # ✨ Clickable cards + status breakdown
├── lib/
│   ├── actions/
│   │   ├── borrows.ts               # ✨ Borrow CRUD
│   │   ├── cases.ts                 # Updated (no assistant/price)
│   │   ├── line.ts                  # ✨ LINE Messaging API
│   │   ├── notifications.ts         # ✨ Enhanced engine (LINE + settings)
│   │   ├── settings.ts              # ✨ + brands, models, notification settings, LINE
│   │   └── users.ts                 # ✨ + createUser, resetPassword, deleteUser
│   └── supabase/
│       └── service.ts               # ✨ Service role client
└── supabase/
    └── migrations/
        ├── 010_update_procedure_types.sql    # ✨ Updated procedure types
        ├── 011_stock_attributes.sql          # ✨ Products columns + brands/models
        ├── 012_inventory_borrowing.sql       # ✨ Borrow system tables
        └── 013_notification_preferences.sql  # ✨ Notification settings + LINE config
```

---

## Environment Variables Required

```env
# Existing
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...     # Required for admin user management

# New (for LINE)
LINE_CHANNEL_ACCESS_TOKEN=...     # From LINE Developers Console
LINE_CHANNEL_SECRET=...           # From LINE Developers Console
```

## Notes
- LINE Messaging API: Free plan = 200 push messages/month, Light plan = 5,000/month
- ต้องสร้าง LINE Official Account + เปิด Messaging API ใน LINE Developers Console
- Users ต้องกรอก LINE User ID ในหน้า Settings (field มีอยู่แล้ว)
- LINE credentials เก็บใน `app_settings` table (admin ตั้งค่าผ่าน UI) แทน env vars
