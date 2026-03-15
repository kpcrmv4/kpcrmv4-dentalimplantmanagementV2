# DentalFlow OS — Setup Guide

## 1. Vercel Environment Variables

ตั้งค่าใน Vercel Dashboard → Settings → Environment Variables

| ตัวแปร | ประเภท | จำเป็น | คำอธิบาย |
|--------|--------|:------:|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | ใช่ | Supabase project URL เช่น `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | ใช่ | Supabase anon/public key (จาก Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | ใช่ | Supabase service role key (จาก Settings → API) — ใช้สำหรับ admin operations ฝั่ง server |
| `CRON_SECRET` | Secret | ไม่ | Secret สำหรับ cron job endpoint เช่น auto re-order check |
| `LINE_CHANNEL_ACCESS_TOKEN` | Secret | ไม่ | LINE Messaging API token (ถ้าต้องการแจ้งเตือนผ่าน LINE) |
| `LINE_CHANNEL_SECRET` | Secret | ไม่ | LINE Channel Secret |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public | ไม่ | VAPID public key สำหรับ Web Push (ยังไม่ได้ใช้งาน) |
| `VAPID_PRIVATE_KEY` | Secret | ไม่ | VAPID private key สำหรับ Web Push (ยังไม่ได้ใช้งาน) |

> หาค่า Supabase ได้ที่: Supabase Dashboard → Project Settings → API

---

## 2. Test Accounts

บัญชีทดสอบที่สร้างไว้แล้วในระบบ (รหัสผ่านทุกบัญชี: `Test1234!`)

| Email | ชื่อ | Role | หน้าที่ |
|-------|------|------|---------|
| `admin@dentalstock.test` | ผู้ดูแลระบบ | `admin` | เห็นทุกเมนู, จัดการผู้ใช้, Audit Logs, ตั้งค่า Discord |
| `dentist@dentalstock.test` | ทพ.สมชาย ฟันดี | `dentist` | สร้างเคส, สั่งของผ่าน Shop, ดูเคสของตัวเอง |
| `stock@dentalstock.test` | คุณวิภา สต็อก | `stock_staff` | จัดการสต็อก, ใบสั่งซื้อ, รับของ, รายงาน |
| `assistant@dentalstock.test` | คุณณัฐ ผู้ช่วย | `assistant` | จัดเตรียมวัสดุ, assign LOT, บันทึกการใช้ |
| `cs@dentalstock.test` | คุณพิมพ์ ซีเอส | `cs` | สร้างเคส, จัดการคนไข้, ยืนยันนัดหมาย |

---

## 3. Supabase Setup สำหรับโปรเจ็คใหม่

### 3.1 สร้าง Supabase Project
1. ไปที่ [supabase.com](https://supabase.com) → New Project
2. เลือก region ใกล้ผู้ใช้ (เช่น Singapore)
3. จดค่า `Project URL`, `anon key`, `service_role key`

### 3.2 รัน Migration Files (ตามลำดับ)

ไปที่ Supabase Dashboard → SQL Editor → รันทีละไฟล์ตามลำดับ:

```
supabase/migrations/001_create_enums.sql         → Enum types ทั้งหมด
supabase/migrations/002_create_tables.sql         → Tables + Triggers + RPC Functions
supabase/migrations/003_create_indexes.sql        → Indexes (FK, composite, partial)
supabase/migrations/004_create_rls_policies.sql   → RLS Policies + Storage bucket
supabase/migrations/005_seed_data.sql             → ข้อมูลตัวอย่าง (suppliers, products, app_settings)
```

> **สำคัญ:** ต้องรันตามลำดับ 001 → 005 เพราะมี dependency ระหว่างไฟล์

### 3.3 สร้าง Test Users

หลังรัน migration แล้ว ต้องสร้าง users ผ่าน Supabase Auth:

1. ไปที่ Supabase Dashboard → Authentication → Users → Add User
2. สร้างทีละคนตามตาราง Section 2 (email + password)
3. หลังสร้างแต่ละคน ให้ insert ข้อมูลใน `public.users` ด้วย SQL:

```sql
-- ใช้ User UID จาก Auth tab มาแทน <uid>
INSERT INTO public.users (id, email, full_name, role) VALUES
  ('<admin-uid>', 'admin@dentalstock.test', 'ผู้ดูแลระบบ', 'admin'),
  ('<dentist-uid>', 'dentist@dentalstock.test', 'ทพ.สมชาย ฟันดี', 'dentist'),
  ('<stock-uid>', 'stock@dentalstock.test', 'คุณวิภา สต็อก', 'stock_staff'),
  ('<assistant-uid>', 'assistant@dentalstock.test', 'คุณณัฐ ผู้ช่วย', 'assistant'),
  ('<cs-uid>', 'cs@dentalstock.test', 'คุณพิมพ์ ซีเอส', 'cs');
```

### 3.4 Enable Realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

### 3.5 ตั้งค่า Storage (ถ้ายังไม่มี)

ไฟล์ `004_create_rls_policies.sql` จะสร้าง bucket `case-photos` อัตโนมัติ
ตรวจสอบได้ที่ Supabase Dashboard → Storage → ต้องเห็น bucket `case-photos`

---

## 4. Deploy ไป Vercel

```bash
# 1. Clone repo
git clone <repo-url>
cd my-app

# 2. Install dependencies
npm install

# 3. ตั้งค่า .env.local (สำหรับ dev)
cp .env.example .env.local
# แก้ค่า NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 4. ทดสอบ local
npm run dev

# 5. Deploy
vercel --prod
```

---

## 5. สรุป Features

| Feature | รายละเอียด |
|---------|-----------|
| Photo Evidence | ถ่ายรูปก่อนบันทึกการใช้วัสดุ (บีบอัดฝั่ง client, เก็บใน Supabase Storage) |
| Emergency Alert 48hr | แบนเนอร์แดงบน Dashboard สำหรับเคสที่ยังไม่พร้อมภายใน 48 ชม. |
| Discord Webhook | แจ้งเตือนอัตโนมัติไปยัง Discord channel (ตั้งค่าใน Settings) |
| Reports | 4 tabs: ภาพรวม, ต้นทุน/เคส, การใช้วัสดุ, ค้นหา Invoice |
| Traffic Light | 5 สี: เขียว(พร้อม), เหลือง(สั่งแล้ว), ส้ม(รอของ), แดง(ขาด), เทา(ยกเลิก) |
| FEFO Reservation | จองวัสดุแบบ First Expiry First Out พร้อม row locking |
| Supplier Scoring | คำนวณคะแนนจัดส่งจาก expected vs actual delivery |
| Dead Stock Alert | แจ้งเตือนสินค้าที่ไม่มีการเคลื่อนไหว 90 วัน |
| Auto Re-order | แจ้งเตือนเมื่อสินค้าต่ำกว่า min stock โดยไม่มี PO ค้างอยู่ |
| iMed Import | นำเข้าข้อมูลคนไข้จาก iMed ด้วย JSON paste |
| Realtime Notifications | Bell badge อัพเดททันทีผ่าน Supabase Realtime |
| Role-based Navigation | Sidebar + Bottom nav แสดง/ซ่อนตาม role |
| Audit Logs | บันทึกทุก INSERT/UPDATE/DELETE บนตารางหลัก (admin เท่านั้นดูได้) |
| User Management | Admin จัดการ role + สถานะผู้ใช้ |
| Thai UI + Noto Sans Thai | UI ภาษาไทย 100% พร้อมฟอนต์ Noto Sans Thai |
| Clinical Indigo Theme | ธีมโทนน้ำเงินเข้ม เหมาะกับคลินิก |
