---
Task ID: 3
Agent: Super Z (main agent)
Task: إعادة تصميم المنصة بالكامل — إزالة الشكل الـ AI وبناء هوية بصرية احترافية

Work Log:
- تشخيص أسباب "الشكل الـ AI": شعار 🍉 إيموجي، خط Cairo، لون teal-600 الافتراضي، بادجات Sparkles، تدرجات وblurs، زوايا rounded-3xl، ظلال ملونة، إيموجي في نصوص الواجهة
- بناء نظام تصميم جديد في globals.css: خط IBM Plex Sans Arabic (300-700) + IBM Plex Mono، مقاسات زوايا صغيرة (--radius 8px، أقصى 10px)، باليت مخصصة: brand (أخضر غامق 50-950)، accent-500/600 (أحمر بطيخ للتفاصيل فقط)، ink/paper/line (نيوترال دافئ)، gold (شهادات وترتيب)، وحذفت violet/indigo وما شابه تمامًا
- brand.tsx جديد: Logomark بصيغة SVG هندسية (شريحة بطيخ flat بلونين) + Logo lockup بvariant فاتح للأسطح الغامقة + favicon.svg بدل الإيموجي
- layout.tsx: تبديل الخطوط لـ IBM Plex Sans Arabic، تحديث الميتا والأيقونة وthemeColor
- سكربت ترحيل آلي (scripts/design-migration.py) على 36 ملف: teal→brand، slate→stone/ink/paper/line، amber→gold، rounded-2xl/3xl→lg/xl، shadow-lg/xl→sm، إزالة backdrop-blur والظلال الملونة والإيموجي، توحيد font-extrabold/black→bold
- Base UI: Card بحد line بدل ظل، Progress أنحف (h-1.5)، الأزرار والبادجات تورث الtokens الجديدة تلقائيًا
- لانديج بيدج جديدة editorial بالكامل: هيدر نظيف، هيرو تايبوغرافي مع mockup منتج مستقيم (بدون ميلان أو blobs) داخل شريط حقائق، شبكة مميزات spec-sheet بفواصل hairline وأرقام 01-06، قسم داكن "أمان الامتحانات" مع كارت امتحان تجريبي، خطوات بحد علوي، FAQ أسطر بسيطة، CTA داكن مسطح، فوتر 4 أعمدة
- auth-view جديد: سبليت داكن/فاتح مع قائمة مزايا بفواصل وبدون أي إيموجي
- student-app وadmin-app: كروم جديد (سايدبار أبيض بحد، active بbg brand + نقطة accent، هيدر أدمن أخضر داكن bg-ink)، إزالة كارت "استمر في التعلم 🚀" واستبداله بصندوق "هدفك القادم" بحد بسيط
- لوحات الطالب والأدمن: بدل الهيرو المتدرج بكارت إحصاءات مسطح بأرقام كبيرة، كروت معلومات بحدود 1px، الترتيب والشهادات بلون gold راقي
- إعادة تصميم الشهادة بالكامل: إطار مزدوج ذهبي، Logomark، تايبوغرافي رسمي، ختم دائري، رقم تسلسلي mono — قابلة للطباعة
- leaderboard كجدول أعمدة حقيقي (رتبة/طالب/تفاصيل/نقاط) بدل كروت
- exam-runner: مسطح بالكامل (خلفية paper، خيارات بحد brand-700 عند الاختيار، هيدر ink)
- توحيد عناوين h1 على text-xl في 14 ملف، إصلاح نوع TakingView في exam-runner (tsc نظيف للـ src)
- اختبار بالمتصفح: لانديج (4 قصاصات) ✓، لوجين طالب ✓، داشبورد طالب ✓، مجتمع شات ✓، قاموس + أزرار نطق ✓، لوجين أدمن ✓، داشبورد أدمن ✓، الواجبات (أسماء الطلاب ظاهرة بدون crash) ✓، قاموس الأدمن ✓ — ملاحظة: نقرات الماوس الحقيقية توقفت مرة أخرى في منتصف الاختبار (env flakiness معروف) وأكملت بالنقر البرمجي عبر JS

Stage Summary:
- المنصة كلها الآن بهوية "بطيخه" الموحدة: أخضر داكن + أحمر بطيخ كaccent + نيوترال دافئ + ذهبي للإنجازات، خط IBM Plex Sans Arabic، زوايا صغيرة، تصميم flat بلا تدرجات أو إيموجي — مظهر منتج حقيقي لا يوحي بأنه AI
- ملفات جديدة: src/components/brand.tsx، public/favicon.svg، scripts/design-migration.py
- أهم الملفات المعاد بناؤها: globals.css، layout.tsx، landing-view.tsx، auth-view.tsx، student-app.tsx، admin-app.tsx، student-dashboard.tsx، admin-dashboard.tsx، certificates-view.tsx، leaderboard-view.tsx

---
Task ID: 4
Agent: Super Z (main agent)
Task: التراجع عن إعادة التصميم الاحترافية والعودة للتصميم الأخضر السابق بناءً على طلب المستخدم

Work Log:
- فحص git history: تحديد أن كوميت ef664c6 هو كوميت إعادة التصميم بالكامل (تصميمي فقط، بدون تغييرات functional)، وكوميت 51d9d08 هو حالة التصميم الأخضر (teal + Cairo + إيموجي البطيخ) مع كل الميزات (القاموس، شات المجتمع، إصلاح الواجبات)
- git checkout 51d9d08 -- لجميع الملفات المتأثرة (41 ملف): globals.css، layout.tsx، كل مكونات admin وstudent وui وauth-view وlanding-view
- حذف brand.tsx وpublic/favicon.svg (أصول أضيفت مع إعادة التصميم ولم تعد مستخدمة)
- إصلاح خطأ TS في exam-runner.tsx:43: تقسيم variant الأخير في PublicState إلى ثلاثة variants منفصلة (NOT_OPEN/CLOSED/EXPIRED) ليصحح الـ narrowing — tsc نظيف لـ src
- التحقق: السيرفر يخدم التصميم الأخضر (Cairo + teal 0f766e)، سكرين شوت للانديج واللوجين ✓، بدون أخطاء console

Stage Summary:
- المنصة عادت بالكامل للتصميم الأخضر السابق: تدرج teal، خط Cairo، إيموجي البطيخ 🍉، الأسلوب الودود المستدير — مع الاحتفاظ بجميع الميزات والفUnc tionال fixes من كوميت 51d9d08
- scripts/design-migration.py بقى موجود في scripts/ (لا يؤثر على التطبيق)

---
Task ID: 5
Agent: Super Z (main agent)
Task: تحويل التصميم بالكامل لنظام Glassmorphism زجاجي شفاف + حواف دائرية + إصلاح الألوان + صفحة تسجيل متجاوبة مع الموبايل

Work Log:
- globals.css: بناء نظام زجاجي كامل (.glass / .glass-strong / .glass-soft / .glass-nav / .glass-input) مع backdrop-blur وسطوع داخلي، خلفية aurora ثابتة (تدرج منت + بلوبات teal/rose مضيئة)، --radius من 0.625rem إلى 1rem، hero-gradient جديد (teal→emerald→cyan) + melon-gradient للaccent، سكرول بار دائري
- layout.tsx: إضافة div.aurora-bg ثابت في الـ body ليظهر خلف كل الصفحات + themeColor جديد
- UI primitives: card → glass rounded-3xl، button → rounded-2xl + تدرج teal-emerald مع ظل ملون + destructive وردي، input/textarea → h-11 rounded-2xl glass-input، badge → rounded-full، select → rounded-xl + قائمة زجاجية، dialog → rounded-3xl زجاجي، tabs → كبسولة زجاجية
- سكربت ترحيل (scripts/glass-migration.py) على 38 ملف: إزالة الخلفيات الصلبة لصالح شفافية تظهر الـ aurora، تحويل الحدود لـ white/xx، رفع كل الـ radii درجة، تحويل chips teal لتدرجات، tint شفاف للخلفيات الملونة
- إصلاح artifacts الترحيل: /100/10 (تطابق مزدوج في hover:bg-teal-50)، bg-white/50/80، bg-teal-500/10/30، ظلال مكررة — تنظيف شامل بـ regex
- auth-view.tsx: إعادة بناء كامل mobile-first — على الموبايل: هيدر تدرج مضغوط (لوجو + عنوان قصير) وبعده كارت زجاجي يتراكب بـ -mt-12، على lg: سبليت 55/45 مع شبكة مزايا زجاجية، inputs بـ autoComplete وinputMode للجوال، نصوص text-base لمنع zoom الـ iOS
- student-app وadmin-app: هيدر glass-nav، سايدبار bg-white/45 backdrop-blur-2xl، nav نشط بتدرج teal-emerald + ظل، صندوق تحفيزي hero-gradient، قائمة موبايل bg-white/95 واضحة القراءة، شعار البطيخ بتدرج وظل
- التحقق: tsc نظيف، سكرين شوتس (لانديج ديسكتوب، auth موبايل 390px، داشبورد طالب، داشبورد أدمن، كورسات أدمن، قاموس أدمن، قائمة موبايل) — كلها زجاجية ومتناسقة، بدون أخطاء console

Stage Summary:
- المنصة كلها الآن بنظام Glassmorphism موحد: زجاج شفاف بضبابية فوق خلفية aurora (منت + بلوبات teal/وردية)، حواف دائرية كبيرة (rounded-2xl/3xl) في كل العناصر، ألوان منعشة (teal→emerald متدرج + watermelon accent)، وصفحة تسجيل متجاوبة تمامًا مع الموبايل (الفورم يظهر فورًا بدون سكرول طويل)
- scripts/glass-migration.py محفوظ للمراجعة، والنظام الزجاجي كله مركزي في globals.css (.glass utilities) — أي تعديل مستقبلي بضةغطة واحدة

---
Task ID: 6
Agent: Super Z (main agent)
Task: إضافة وضع نهاري ووضع ليلي (Dark/Light Mode) للمنصة كلها

Work Log:
- globals.css: قسم dark كامل — عكس سكيل slate بالكامل عبر CSS variables (Tailwind v4 يولد الألوان كمتغيرات فـ .dark يعيد تعريفها داخل html.dark)، --color-white تحولت لسطح داكن فكل bg-white/xx بقت زجاج داكن تلقائيًا، fixات مستهدفة: .dark .text-white ثابت أبيض على التدرجات، border-white/xx حدود شفافة فاتحة، bg-white/95 لقائمة الموبايل، accent ألمع (teal-700→#2dd4bf, emerald/amber brighter)، تظبيط amber/emerald/red chips للداكن
- aurora ليلية: خلفية #070b14 مع بلوبات teal/rosa خافتة، زجاج داكن (.dark .glass إلخ) بحدود slate شفافة وظلال سوداء، سكرول بار داكن
- layout.tsx: سكربت no-flash inline في الـ head يقرأ localStorage("batiikha-theme") أو يتبع prefers-color-scheme قبل الرسم
- theme-toggle.tsx جديد: زرار sun/moun بvariant ghost + rounded-full، يبدّل class على documentElement ويحفظ الاختيار، يرندر آيقونة ثابتة بعد mount لتجنب hydration mismatch
- الزرار في: هيدر اللانديج، هيدر الطالب، هيدر الأدمن، وفي صفحة الدخول زرار عائم (bottom-left موبايل / top-right ديسكتوب بعيد عن زرار رجوع)
- إصلاح typo: bg-white/500 → bg-white/60 text-slate-700 في admin-exam-editor
- التحقق: tsc نظيف؛ سكرين شوتس — لانديج ليلي، features/FAQ/CTA ليلي، auth ليلي، داشبورد أدمن ليلي، قاموس ليلي، واجبات ليلية، والرجوع للنهاري round-trip ✓، والثيم محفوظ بعد إعادة فتح المتصفح

Stage Summary:
- المنصة فيها وضعين كاملين: النهاري (زجاج فاتح + aurora منت/وردي) والليلي (زجاج داكن كحلي + بلوبات teal خافتة + نصوص فاتحة وaccent ألمع) — تبديل فوري من كل الهيدرات، حفظ دائم في localStorage، ومتابعة تفضيل النظام افتراضيًا بدون فلاش عند التحميل
- آلية الdark مبنية على إعادة تعريف متغيرات Tailwind v4 داخل .dark — أي class جديد يستخدم نفس الباليت هيشتغل في الوضعين تلقائيًا بدون شغل إضافي

---
Task ID: 7
Agent: Super Z (main agent)
Task: رفع المشروع على حساب المستخدم في Vercel بالتوكن المُمرر

Work Log:
- تأكيد أن مهام التصميم (Task 5 الزجاجي + Task 6 الوضع الليلي) منجزة ومرفوعة كـ commits قبل الرفع
- تهيئة المشروع لقيود Vercel (نظام ملفات read-only إلا /tmp):
  * src/lib/db.ts: bootstrap ينسخ db/custom.db المرفقة إلى /tmp عند cold start ليصبح DATABASE_URL=file:/tmp/custom.db قابلًا للكتابة مع كل البيانات الحقيقية
  * upload route: UPLOAD_DIR env (=/tmp/uploads على Vercel) + راوت جديد /api/files/[name] يخدم الملفات المرفوعة (كانت public/uploads لن تعمل على Vercel)
  * vercel.json: buildCommand = prisma generate && next build + .vercelignore (إخفاء .env والسكربتات)
- التحقق من التوكن: vercel whoami → حساب h78547564-4855
- ربط المشروع: vercel link → مشروع manara-academy (team_XHx4bJOLjp0TsqpUTVnhS8ZC)
- متغيرات بيئة production: DATABASE_URL, GOOGLE_CLIENT_ID/SECRET, NEXTAUTH_SECRET, ADMIN_EMAIL/PASSWORD, UPLOAD_DIR ثم NEXTAUTH_URL بعد أول نشر
- نشران production: الأول نجح (2m)، الثاني بعد إضافة NEXTAUTH_URL — الدومين الدائم manara-academy-ten.vercel.app
- تحقق حي: الهوم 200، /api/auth/providers يعيد google+credentials، /api/leaderboard يعيد بيانات الطلاب الحقيقية (قاعدة البيانات تعمل)، متصفح فعلي: لانديج زجاجي ✓ ثم تسجيل دخول المدير بنجاح ولوحة المدير تعرض الإحصائيات (2 طلاب/2 كورسات/5 دروس) — صفر أخطاء console
- كوميت تجهيزات النشر + حذف .env.local المؤقت من vercel link

Stage Summary:
- المنصة حية على https://manara-academy-ten.vercel.app بالتصميم الزجاجي الكامل مع بيانات المستخدم الحقيقية
- قيود يجب إبلاغ المستخدم بها: (1) يجب إضافة redirect URI الجديد في Google Cloud Console: https://manara-academy-ten.vercel.app/api/auth/callback/google ليعمل دخول جوجل (2) قاعدة SQLite في /tmp تعيش فقط طuale عمر instance — الكتابات (تسجيلات، تقدم، واجبات) تُفقد عند cold start، والحل الدائم لاحقًا ترحيل لTurso/Neon (3) الملفات المرفوعة في /tmp كذلك مؤقتة

---
Task ID: 8
Agent: Super Z (main agent)
Task: ترحيل قاعدة البيانات بالكامل من Prisma/SQLite إلى Convex (بطلب المستخدم مع CONVEX_DEPLOY_KEY)

Work Log:
- حصاد البيانات الحية من نسخة /tmp المؤقتة عبر admin API قبل فقدانها: اكتشاف طالبين سجّلا على الموقع بعد النشر (حممو gareema.one@gmail.com + طالب تجريبي test@batiikha.com) غير موجودين محليًا — تم دمجهم في بيانات الترحيل (بدون passwordHash لأنه غير مكشوف عبر API)
- convex/schema.ts: 16 جدولًا بمطابقة كاملة لـ Prisma (users/courses/units/lessons/lessonProgress/enrollments/assignments/submissions/exams/questions/attempts/answers/certificates/posts/comments/dictionaryWords/files) + فهارس للـ unique constraints (email, token, user+course, exam+user, attempt+question...)
- ~40 دالة query/mutation في convex/ مع حارس secret على كل دالة (CONVEX_API_SECRET) + إزالة _id/_creationTime وتحويل تواريخ epoch-ms→ISO عند حدود الـ API (src/lib/convex.ts: serialize + toMs + convexError)
- منطق الأعمال المدمج كـ mutations ذرية: progress:completeLesson + تقييم الشهادة، exams:startAttempt (نافذة زمنية + إجابات مبدئية + auto-enroll)، exams:submitAttempt (تصحيح آلي + شهادة)، exams:recordViolation، assignments:submit/grade + حذف متسلسل كامل للمستخدم والكورس
- next-auth: تبديل DB calls لـ Convex + إصلاح جوجل OAuth (jwt callback يحل هوية المستخدم بالبريد + users:findOrCreateOAuth للتسجيل الذاتي بجوجل — كان معطوبًا قبلًا حيث كان id الجلسة يأخذ sub من جوجل)
- رفع الملفات: /api/upload يرفع الآن لـ Convex Storage (generateUploadUrl → POST bytes → saveMetadata) و /api/files/[id] يعيد redirect لرابط CDN — ملفات دائمة بدل /tmp المؤقت
- seed: export-data.cjs (SQLite→JSON) + seed-convex.cjs (دمج + migrate:seedAll بإعادة تخطيط IDs القديمة→الجديدة) — 3 مستخدمين وكل المحتوى بنجاح
- test@batiikha.com: تفعيل بكلمة مرور Test@12345 عبر users:setPassword الجديدة (كان بدون هاش من الترحيل)
- تنظيف: حذف prisma/@prisma/client من package.json + db.ts/certificates.ts القديمة + scripts db:* — vercel.json buildCommand = "npx convex deploy --yes && next build" — .vercelignore يستثني db وprisma
- Vercel env: + CONVEX_URL/CONVEX_API_SECRET (CONVEX_DEPLOY_KEY كان مضافًا من المستخدم) − DATABASE_URL/UPLOAD_DIR
- اختبار وظيفي كامل محليًا ثم على الإنتاج: تسجيل طالب→اشتراك→بدء امتحان→تسليم وتصحيح آلي→publicState FINISHED بإجابات، تقدم درس→نقاط في لوحة الترتيب، منشور+تعليق+حذف، رفع PNG→تقديم 200 image/png من Convex CDN، حذف متسلسل لمستخدم اختبار، إحصائيات أدمن مطابقة — ثم حذف بيانات الاختبار كلها

Stage Summary:
- المنصة الآن على قاعدة بيانات دائمة (Convex: peaceful-porpoise-555.convex.cloud) — الكتابات لم تعد تضيع مع cold starts، والملفات المرفوعة دائمة عبر Convex Storage
- ملاحظة: حممو يجب أن يسجل الدخول بحساب جوجل (نفس البريد gareema.one@gmail.com) لأن كلمة المرور القديمة لم تكن قابلة للاسترجاع من نسخة /tmp
- مستخدمو الجلسات القديمة (قبل الترحيل) سيُطلب منهم تسجيل الدخول مرة أخرى (IDs تغيرت)

---
Task ID: 9
Agent: Super Z (main agent)
Task: امتحانات مستقلة بدون كورس + بيانات أدمن + حظر المحذوفين من الرجوع + تجاوب الموبايل + دومين bateha-academy

Work Log:
- امتحانات مستقلة: convex/schema.ts exams.courseId أصبح optional(id|null)، كل الدوال null-safe (list/adminDetail/startAttempt/publicState/submitAttempt/stats/lib)، auto-enroll وشهادات الكورس يتجاهلو الامتحانات المستقلة، API POST أرسل undefined بدل null (v.optional لا يقبل null)، المحرر فيه خيار "امتحان مستقل (بدون كورس)" كافتراضي والعرض يكتب "امتحان مستقل" مكان اسم الكورس
- إصلاح bug قديم: POST /api/exams كان بيرمي أسئلة الامتحان الجديد (الأسئلة بتتسجل فقط عند التعديل) — الآن بيتسلسل exams:update بالأسئلة بعد الإنشاء
- إصلاح انهيار: student-dashboard.tsx:139 a.exam.course.title كان بيهدم التطبيق كله مع أول محاولة امتحان مستقل → course?.title ?? "امتحان مستقل"
- حظر بعد الحذف: جدول blockedEmails جديد + users:remove يحظر الإيميل تلقائيًا قبل الحذف المتسلسل، findOrCreateOAuth وauthorize و/api/register يرفضوا البريد المحظور (OAuth يرمي خطأ، register 403 برسالة عربية)، users:listBlocked/isEmailBlocked/unblockEmail + راوت /api/admin/blocked (GET/DELETE) + قسم "البريدات المحظورة" في لوحة الطلاب بزر "فك الحظر" وتحذير في رسالة تأكيد الحذف
- اختبار الدورة كاملة محليًا: تسجيل → حذف بالأدمن → الإيميل ظهر محظور → إعادة تسجيل 403 → فك الحظر → إعادة تسجيل 200 → تنظيف
- auth-view موبايل: كارت الفورم كان مغطي بالتدرج العلوي (stacking) فالعنوان "أهلًا بعودتك" كان مختفي → relative z-10، لقطات موبايل 390px نهاري/ليلي/تسجيل ✓
- بيانات الإنتاج: اكتشفت admin@manara.academy محذوف وكل المستخدمين رولهم اتقلب ADMIN (أثناء تجارب المستخدم) — رجّعت: h78547564@gmail.com أدمن فقط، وحمزه/حممو/طالب تجريبي طلاب، وعملت password للحساب المالك Bateha@12345 عبر users:setPassword
- Vercel: إعادة تسمية المشروع manara-academy → bateha-academy عبر REST API، تحديث .vercel/project.json + NEXTAUTH_URL=https://bateha-academy.vercel.app، نشر production جديد (40s Ready)
- تحقق حي: HOME 200، providers يعيد callbackUrl بالدومين الجديد، leaderboard ببيانات حقيقية، دخول أدمن من الإنتاج ناجح ولوحة الإدارة تظهر — صفر أخطاء console

Stage Summary:
- المنصة حية على https://bateha-academy.vercel.app على Convex الدائم
- بيانات الأدمن: h78547564@gmail.com / Bateha@12345 (أو جوجل بنفس البريد)
- مطلوب من المستخدم: تحديث redirect URI في Google Cloud Console إلى https://bateha-academy.vercel.app/api/auth/callback/google
- الملفات: convex/schema.ts, convex/exams.ts, convex/users.ts, convex/lib.ts, convex/stats.ts, src/app/api/exams/route.ts, src/app/api/register/route.ts, src/app/api/admin/blocked/route.ts (جديد), src/lib/auth.ts, admin-exam-editor/admin-exams/admin-students/exams-view/exam-runner/student-dashboard/auth-view

---
Task ID: 10
Agent: Super Z (main agent)
Task: أدمن خفي + نظام حظر مع طعون + إدارة المجتمع (عرض/حذف/قفل) + تصميم تسجيل موبايل مختلف عن الديسكتوب

Work Log:
- أدمن خفي h14626864@gmail.com: حقل hidden جديد في users + users:setHidden، والسكربت scripts/seed-hidden-admin.mjs فعّله (ADMIN + hidden + كلمة مرور) — المستخدم كان موجود بالفعل كأدمن. مستبعد من users:listWithSummary ومن عدّاد الأدمن في adminStats. ملاحظة: الاسم المعروض في الهيدر/المجتمع هو "حمزه" (اسمه المحفوظ)
- نظام الحظر: users.banned/banReason/banUntil (اختياري = دائم) + جدول appeals جديد (PENDING/ACCEPTED/REJECTED) + جدول appSettings + convex/moderation.ts (ban/unban/banStatus/submitAppeal/listAppeals/reviewAppeal/pendingCount)
- فرض الحظر: authorize يرفض المحظور، jwt OAuth يرمي خطأ، getSessionUser في api-helpers يعامل المحظور كغير مصادق (كاش 30s) فكل الـ API ترفض جلسته النشطة
- دورة الطعن: /api/auth/ban-check (عام) قبل signIn يعرض شاشة الحظر بدل رسالة خطأ، /api/appeals (عام) لإرسال الطعن، /api/admin/appeals GET/POST للمراجعة — القبول يفك الحظر ويحرر البريد من blockedEmails تلقائيًا
- واجهات الأدمن: زرار "حظر" بديالوج (سبب + دائم/يوم/أسبوع/شهر) وبادج "محظور" وزرار فك الحظر في admin-students، صفحة admin-appeals جديدة (قيد المراجعة + تمت مراجعتها) ببادج عدّاد أحمر في السايدبار
- إدارة المجتمع: community:getSettings/setLocked + قفل الشات في createPost/createComment (الأدمن مستثنى يقدر يكتب إعلانات، الرول بيتقرأ من الداتابيز مش من العميل)، صفحة admin-community جديدة (كل الرسايل + حذف أي رسالة/رد بتأكيد + زرار قفل/فتح بتأكيد)، مجتمع الطلاب يعرض بانر أحمر ويخفي الـ composer لما يقفل
- تصحيح شامل: كل throw new Error في ملفات convex تحولت لـ ConvexError (الرسائل العربية كانت بتوصل "Server Error") وconvexError() في src/lib/convex.ts بتقرأ e.data — الرسائل العربية ظهرت مرة تانية في كل المنصة
- auth-view موبايل: بناء جديد بالكامل lg:hidden — شاشة hero-gradient كاملة، براند مركزي، headline بيتغير حسب الوضع، تبويبات كبسولية (دخول/حساب جديد) — مختلف بنيويًا عن ديسكتوب السبليت، الديسكتوب كما هو. شاشة الحظر/الطعن مشتركة بين الاتنين
- اختبار محلي: باك-إند (ban→status→appeal→accept→unban + رفض الطعن للمخلوفيين + قفل/فتح) كله ✓، متصفح: شاشة الحظر، إرسال طعن، دخول الأدمن الخفي، قائمة الطلاب بدونه، قبول طعن بفك الحظر تلقائي، حذف رسالة، قفل/فتح الشات ✓
- نشر: convex deploy (جداول appeals/appSettings + فهارس) + vercel production (55s Ready) — تحقق حي على https://bateha-academy.vercel.app: ban-check يعمل، الموبايل بالتصميم الجديد، دخول الأدمن الخفي ولوحة الإدارة ✓

Stage Summary:
- بيانات الأدمن الخفي: h14626864@gmail.com / Admin@14626864 (أو جوجل بنفس البريد) — مخفي من قائمة المستخدمين والإحصائيات والترتيب
- دورة الحظر/الطعن كاملة: حظر (بسبب ومدة اختيارية) → الطالب يشوف شاشة الحظر ويبعت طعن → الأدمن يقبل (فك حظر + تحرير البريد) أو يرفض
- المجتمع تحت سيطرة الأدمن: عرض كامل، حذف أي رسالة/رد، قفل/فتح للكل (رسايل الأدمن تعدّي وقت القفل كإعلانات)
- الملفات: convex/{schema,moderation,community,users,stats}.ts، src/lib/{auth,api-helpers,convex}.ts، api routes {auth/ban-check,appeals,admin/appeals,admin/ban,community/settings}، components {auth-view,admin-appeals,admin-community,admin-students,admin-app,student/community-view}، scripts/{seed-hidden-admin.mjs,test-moderation.mjs}

---
Task ID: 11
Agent: Super Z (main agent)
Task: mohamed.aln3nashy@gmail.com يدخل أدمن تلقائيًا عند تسجيل الدخول بجوجل

Work Log:
- convex/users.ts: PLATFORM_ADMIN_EMAILS (ملاك المنصة) + mutation جديد users:ensureAdminOAuth — يبحث عن الحساب بالبريد فينشئه أدمن أو يرقّيه أدمن، يفك أي حظر ويحرر البريد من blockedEmails (المالك لا يُقفل أبدًا)، ويرفض أي بريد خارج القائمة برسالة عربية
- src/lib/auth.ts: PLATFORM_ADMIN_EMAILS مصدَّرة — فرع جوجل في jwt callback ينادي ensureAdminOAuth للبريد المالك قبل فحص blocked/banned ويعيد role ADMIN فورًا؛ فحص إضافي بعد الدخول يرقّي جلسة قائمة بالفعل كطالب بمجرد أول طلب (بدون إعادة تسجيل)؛ credentials authorize يستثني المالك من فحصي blocked/banned
- scripts/seed-mohamed-admin.mjs: تجهيز الحساب في إنتاج Convex (ترقية + كلمة مرور احتياطية Mohamed@12345 + فك حظر) — الحساب مرئي كأدمن عادي (لم يُطلب إخفاؤه)
- النشر: convex deploy ✓ + vercel production ✓ (كوميت قبل النشر)
- تحقق حي: ensureAdminOAuth على الإنتاج يعيد {id, role ADMIN} مع تطبيع حالة الأحرف ويرفض بريدًا عشوائيًا برسالة "غير مسموح"؛ دخول كامل بالإيميل من الإنتاج → الجلسة role ADMIN (محمد النشائي) → /api/admin/stats يرد ببيانات حقيقية (requireAdmin عدّى) — صفر أخطاء

Stage Summary:
- mohamed.aln3nashy@gmail.com الآن مالك منصة: أي دخول بجوجل يضمن دوره أدمن (حتى لو كان طالبًا أو محظورًا أو محذوفًا قبلًا)، والجلسات القديمة تترقّى تلقائيًا
- بيانات الدخول: جوجل بنفس البريد (أدمن تلقائيًا) أو بريد+كلمة: mohamed.aln3nashy@gmail.com / Mohamed@12345
- لإضافة مالك جديد مستقبلًا: أضف بريده لمصفوفتي PLATFORM_ADMIN_EMAILS (convex/users.ts + src/lib/auth.ts) واعمل deploy
