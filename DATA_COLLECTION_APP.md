# تطبيق جمع البيانات مع الموافقة - دليل كامل

## 🎯 النظام الأساسي
تطبيق ويب متكامل يجمع بيانات المستخدمين **فقط بعد موافقة صريحة** وينقلها إلى سيرفر آمن.

### المكونات:
1. **نموذج الويب (Frontend)** - يطلب موافقة صريحة
2. **السيرفر (Backend)** - يستقبل البيانات ويخزنها
3. **قاعدة البيانات** - PostgreSQL لتخزين آمن
4. **إدارة بيانات** - تصدير وتدقيق البيانات

---

## ⚡ التشغيل السريع

### 1️⃣ **التثبيت المحلي**

```bash
# استنساخ المشروع
git clone https://github.com/monibkhaldi21-design/auth-consent-demo-public.git
cd auth-consent-demo-public

# تثبيت المكتبات
npm install

# نسخ ملف الإعدادات
cp .env.example .env

# تشغيل السيرفر
npm start
# ستجد التطبيق على http://localhost:3000
```

### 2️⃣ **التشغيل مع Docker**

```bash
docker-compose up -d
# السيرفر: http://localhost:3000
# قاعدة البيانات: postgres://localhost:5432/authdemo
```

---

## 📋 الميزات الرئيسية

### ✅ جمع البيانات
- ✔️ البريد الإلكتروني + كلمة المرور
- ✔️ رفع الملفات (صور، PDF، نصوص)
- ✔️ تسجيل وقت الموافقة بالضبط
- ✔️ تسجيل عنوان IP والمتصفح

### ✅ الأمان
- 🔒 تشفير كلمات المرور بـ bcrypt
- 🔒 توقيع JWT لحماية العمليات
- 🔒 تصفية أنواع الملفات المسموحة
- 🔒 حدود حجم الرفع (قابلة للتخصيص)

### ✅ الامتثال والخصوصية
- 📝 موافقة صريحة إلزامية
- 🕐 تسجيل دقيق لأوقات الموافقة
- 📊 تقارير تدقيق شاملة
- 🗑️ حذف تلقائي للبيانات القديمة

---

## 🔧 الإعدادات (ملف .env)

```env
# قاعدة البيانات
DATABASE_URL=postgres://postgres:postgres@localhost:5432/authdemo

# أمان المدير
ADMIN_USER=admin
ADMIN_PASSWORD=your-strong-password
ADMIN_JWT_SECRET=your-jwt-secret

# تصدير البيانات
EXPORT_JWT_SECRET=your-export-secret

# البريد الإلكتروني (اختياري - للتصدير عبر الإيميل)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yoursite.com

# حدود الملفات
MAX_UPLOAD_MB=20
ALLOWED_MIME=image/jpeg,image/png,application/pdf,text/plain

# الحفظ
RETENTION_DAYS=365

# CORS (إذا كان الواجهة في نطاق آخر)
ENABLE_CORS=true
ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:3001

PORT=3000
```

---

## 📡 نقاط النهاية (API Endpoints)

### 1. إرسال البيانات
**POST** `/receive`
```json
{
  "email": "user@example.com",
  "password": "mypassword",
  "consent": true,
  "consent_at": "2026-08-26T12:00:00Z",
  "consent_text": "وافقت على نقل بياناتي",
  "hashed": false
}
```
**الرد:** `{ ok: true, id: 123 }`

---

### 2. رفع الملفات
**POST** `/upload` (multipart/form-data)
- `files[]` - الملفات (متعدد)
- `email` - البريد
- `consent` - true
- `consent_at` - وقت الموافقة

**الرد:**
```json
{
  "ok": true,
  "saved": 2,
  "files": [
    { "original": "document.pdf", "stored": "timestamp-hash-document.pdf", "size": 204800 }
  ]
}
```

---

### 3. طلب تصدير البيانات
**POST** `/request-export`
```json
{
  "email": "user@example.com"
}
```
💌 سيرسل لك رابط تصدير عبر البريد (ساري لـ 15 دقيقة فقط)

---

### 4. تنزيل البيانات المصدّرة
**GET** `/export-data?token=JWT_TOKEN`

يرجع ملف JSON:
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "consent_at": "2026-08-26T12:00:00Z",
    "received_at": "2026-08-26T12:00:00Z"
  },
  "files": [
    { "original_name": "document.pdf", "stored_name": "...", "size_bytes": 204800 }
  ]
}
```

---

### 5. لوحة التحكم (إدارة)

#### تسجيل الدخول
**POST** `/admin/login`
```json
{
  "username": "admin",
  "password": "your-password"
}
```
**الرد:** `{ token: "JWT_TOKEN" }`

#### عرض جميع السجلات
**GET** `/records`  
**رؤوس:** `Authorization: Bearer JWT_TOKEN`

---

## 📊 قاعدة البيانات

### جدول المستخدمين (users)
```sql
id              | SERIAL PRIMARY KEY
email           | TEXT UNIQUE
password_hash   | TEXT (مشفّر)
consent_given   | BOOLEAN
consent_at      | TIMESTAMP
client_ip       | TEXT
user_agent      | TEXT
received_at     | TIMESTAMP
```

### جدول الملفات (files)
```sql
id              | SERIAL PRIMARY KEY
user_email      | TEXT
original_name   | TEXT
stored_name     | TEXT
mime_type       | TEXT
size_bytes      | BIGINT
uploaded_at     | TIMESTAMP
```

### جدول التدقيق (exports_audit)
```sql
id              | SERIAL PRIMARY KEY
user_email      | TEXT
request_ip      | TEXT
token           | TEXT
created_at      | TIMESTAMP
```

---

## 🚀 حالات الاستخدام

### 1. **تطبيق استطلاع رأي**
- اجمع البيانات الديموغرافية فقط بالموافقة
- خزّن الردود بأمان

### 2. **نموذج تسجيل المستخدمين**
- تحقق من الهوية قبل النقل
- احفظ سجل الموافقة

### 3. **نموذج رفع المستندات**
- اطلب موافقة حبلية واضحة
- خزّن الملفات بأمان مع البيانات الوصفية

### 4. **جمع ملاحظات العملاء**
- ضمن التزام GDPR
- حفظ كامل للتسلسل الزمني

---

## 🔐 الأمان - نقاط مهمة

✔️ **استخدم HTTPS في الإنتاج**  
✔️ **غيّر كل المفاتيح السرية (.env)**  
✔️ **فعّل CORS بحذر (فقط النطاقات الموثوقة)**  
✔️ **استخدم كلمات مرور قوية**  
✔️ **راقب السجلات بانتظام**  
✔️ **احذف البيانات القديمة تلقائياً**

---

## 📱 الواجهة الأمامية (الويب)

تفتح على `http://localhost:3000` وتعرض نموذج تفاعلي:

1. أدخل البريد وكلمة المرور
2. اختر الملفات (اختياري)
3. **اقبل الموافقة الصريحة**
4. اضغط "إرسال إلى السيرفر"
5. سيتم تخزين البيانات بأمان ✅

---

## 🛠️ استكشاف الأخطاء

### المشكلة: "Error: Database connection failed"
```bash
# تأكد من تشغيل PostgreSQL
docker-compose up -d db
# وتحقق من DATABASE_URL في .env
```

### المشكلة: "File type not allowed"
عدّل `ALLOWED_MIME` في `.env`:
```env
ALLOWED_MIME=image/jpeg,image/png,application/pdf,text/plain,application/msword
```

### المشكلة: "SMTP not configured"
إذا لم تحتج تصدير عبر الإيميل، اترك `SMTP_HOST` فارغاً

---

## 📜 الترخيص
MIT License - استخدم بحرية للمشاريع الشخصية والتجارية

---

**تم تطويره بواسطة:** monibkhaldi21-design  
**آخر تحديث:** 2026-08-26

