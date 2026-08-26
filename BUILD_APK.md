# 🚀 بناء ملف APK

## الخطوات السريعة:

### 1. تثبيت المتطلبات
```bash
npm install -g eas-cli
npm install -g expo-cli
```

### 2. تسجيل الدخول إلى Expo
```bash
eas login
```
(أنشئ حساب على https://expo.dev إذا لم يكن لديك)

### 3. بناء APK
```bash
cd android-app
eas build --platform android --type apk
```

### 4. اختر الخيارات:
- Use new keystore? → **y** (yes)
- Wait for build? → **y** (yes)

### 5. تحميل APK
بعد انتهاء البناء (10-15 دقيقة)، ستحصل على رابط التحميل

---

## 📝 ملاحظات:
- الخدمة **مجانية** من Expo
- سيحفظ الـ keystore تلقائياً لعمليات بناء مستقبلية
- الملف APK سيكون حوالي 50-100 MB

---

**هل تريد المساعدة في أي خطوة؟**
