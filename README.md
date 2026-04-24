# مشروع حفاظ (Hoffad)

تطبيق لتعلم وحفظ القرآن الكريم باستخدام تقنيات الذكاء الاصطناعي.

## طريقة التثبيت (Installation)

1. قم بتحميل الكود المصدري للمشروع.
2. تأكد من وجود Node.js مثبت على جهازك.
3. قم بتثبيت المكتبات المطلوبة:
   ```bash
   npm install
   ```

## متغيرات البيئة المطلوبة (Environment Variables)

يجب إنشاء ملف باسم `.env` في المجلد الرئيسي للمشروع وإضافة القيم التالية:

### إعدادات Firebase (Front-end)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_DATABASE_ID`

### إعدادات Gemini AI
- `GEMINI_API_KEY`: لاستخدامه في الخادم (Backend).
- `VITE_GEMINI_API_KEY`: لاستخدامه في واجهة المستخدم (Optional).

### إعدادات Firebase Admin (للدخول عبر التلفاز)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

## تشغيل المشروع محلياً

لتشغيل التطبيق في بيئة التطوير:
```bash
npm run dev
```

## خطوات النشر على hoffad.com (Deployment)

1. **بناء المشروع**:
   قم بتشغيل الأمر التالي لإنشاء نسخة الإنتاج:
   ```bash
   npm run build
   ```
   سيتم إنشاء مجلد باسم `dist` يحتوي على ملفات المشروع الجاهزة للنشر.

2. **رفع الملفات**:
   قم برفع محتويات مجلد `dist` إلى المجلد الرئيسي على خادم `hoffad.com`.

3. **إعداد الخادم (Server Configuration)**:
   - تأكد من توجه جميع المسارات (Routes) إلى ملف `index.html` لدعم React Router.
   - إذا كنت تستخدم Nginx، استخدم الإعداد التالي:
     ```nginx
     location / {
         try_files $uri $uri/ /index.html;
     }
     ```

4. **SSL**:
   تأكد من تفعيل شهادة SSL (HTTPS) لضمان عمل الميكروفون والميزات الأخرى بشكل صحيح.
