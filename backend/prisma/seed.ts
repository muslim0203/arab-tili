import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ══════════════════════════════════════════════════
  // 1. Create 3 fixed Listening Stages
  // ══════════════════════════════════════════════════
  const stages = [
    {
      stageType: "short_dialogue",
      titleArabic: "المحادثة القصيرة بين رجل والمرأة",
      timingMode: "per_question",
      perQuestionSeconds: 60,
      totalSeconds: null,
    },
    {
      stageType: "long_conversation",
      titleArabic: "رواية وسؤال / المحادثة الطويلة",
      timingMode: "total",
      perQuestionSeconds: null,
      totalSeconds: 420,
    },
    {
      stageType: "lecture",
      titleArabic: "المحاضرة",
      timingMode: "total",
      perQuestionSeconds: null,
      totalSeconds: 420,
    },
  ];

  for (const stage of stages) {
    await prisma.listeningStage.upsert({
      where: { stageType: stage.stageType },
      update: {
        titleArabic: stage.titleArabic,
        timingMode: stage.timingMode,
        perQuestionSeconds: stage.perQuestionSeconds,
        totalSeconds: stage.totalSeconds,
      },
      create: stage,
    });
  }
  console.log("✅ 3 Listening stages created/updated");

  // ══════════════════════════════════════════════════
  // 2. Seed example Grammar Questions (10 per difficulty)
  // ══════════════════════════════════════════════════
  const grammarCount = await prisma.grammarQuestion.count();
  if (grammarCount === 0) {
    const grammarQuestions = [
      // Easy
      { difficulty: "easy", prompt: "اختر الكلمة الصحيحة: أنا _____ طالب.", options: JSON.stringify(["أكون", "هو", "أنتِ", "نحن"]), correctIndex: 0 },
      { difficulty: "easy", prompt: "ما هو جمع كلمة \"كتاب\"؟", options: JSON.stringify(["كتب", "كاتب", "مكتبة", "كتابة"]), correctIndex: 0 },
      { difficulty: "easy", prompt: "اختر الضمير المناسب: _____ تدرس في الجامعة.", options: JSON.stringify(["هي", "هو", "أنا", "نحن"]), correctIndex: 0 },
      { difficulty: "easy", prompt: "ما معنى كلمة \"بيت\"؟", options: JSON.stringify(["منزل", "مدرسة", "سيارة", "كتاب"]), correctIndex: 0 },
      { difficulty: "easy", prompt: "أكمل: ذهبتُ إلى _____.", options: JSON.stringify(["المدرسة", "يذهب", "ذاهب", "ذهاب"]), correctIndex: 0 },
      // Medium
      { difficulty: "medium", prompt: "اختر الإعراب الصحيح: جاء الطالبُ _____.", options: JSON.stringify(["المجتهدُ", "المجتهدَ", "المجتهدِ", "مجتهداً"]), correctIndex: 0 },
      { difficulty: "medium", prompt: "ما هو المصدر من الفعل \"كَتَبَ\"؟", options: JSON.stringify(["كِتابة", "كاتِب", "مَكتوب", "كُتُب"]), correctIndex: 0 },
      { difficulty: "medium", prompt: "اختر الجملة الصحيحة نحوياً:", options: JSON.stringify(["إنَّ الطالبَ مجتهدٌ", "إنَّ الطالبُ مجتهدٌ", "إنَّ الطالبِ مجتهدٌ", "إنَّ الطالبَ مجتهدٍ"]), correctIndex: 0 },
      { difficulty: "medium", prompt: "ما نوع الجملة: \"العلمُ نورٌ\"؟", options: JSON.stringify(["جملة اسمية", "جملة فعلية", "شبه جملة", "جملة شرطية"]), correctIndex: 0 },
      { difficulty: "medium", prompt: "أعرب كلمة \"الكتابَ\" في: قرأتُ الكتابَ.", options: JSON.stringify(["مفعول به منصوب", "فاعل مرفوع", "مبتدأ مرفوع", "خبر مرفوع"]), correctIndex: 0 },
      // Hard
      { difficulty: "hard", prompt: "ما إعراب \"إياك\" في: إياك نعبد؟", options: JSON.stringify(["مفعول به مقدم", "فاعل", "مبتدأ", "حال"]), correctIndex: 0 },
      { difficulty: "hard", prompt: "اختر التصريف الصحيح للفعل المضارع المنصوب:", options: JSON.stringify(["لن يذهبَ", "لن يذهبُ", "لن يذهبْ", "لن يذهبِ"]), correctIndex: 0 },
      { difficulty: "hard", prompt: "ما الفرق بين \"إن\" و \"أن\"؟", options: JSON.stringify(["إنّ للتوكيد وأنّ مصدرية", "لا فرق بينهما", "إنّ شرطية وأنّ للتوكيد", "كلاهما للتوكيد فقط"]), correctIndex: 0 },
      { difficulty: "hard", prompt: "أعرب: \"كان الجوُّ صحواً.\" – ما إعراب \"صحواً\"؟", options: JSON.stringify(["خبر كان منصوب", "حال منصوب", "مفعول به", "تمييز"]), correctIndex: 0 },
      { difficulty: "hard", prompt: "ما وزن كلمة \"استغفار\"؟", options: JSON.stringify(["استفعال", "افتعال", "تفاعل", "انفعال"]), correctIndex: 0 },
    ];

    await prisma.grammarQuestion.createMany({ data: grammarQuestions });
    console.log(`✅ ${grammarQuestions.length} Grammar questions seeded`);
  }

  // ══════════════════════════════════════════════════
  // 3. Seed example Reading Passages
  // ══════════════════════════════════════════════════
  const readingCount = await prisma.readingPassage.count();
  if (readingCount === 0) {
    // Short passage (easy)
    const shortPassage = await prisma.readingPassage.create({
      data: {
        difficulty: "easy",
        passageType: "short",
        text: "ذهب أحمد إلى المكتبة ليستعير كتاباً عن التاريخ العربي. وجد كتاباً مفيداً عن الحضارة الإسلامية في الأندلس. قرأ أحمد الكتاب في أسبوع واحد وأعجب به كثيراً. قرر أن يكتب تقريراً عن الكتاب ليشاركه مع زملائه في الصف. كان المعلم سعيداً بعمل أحمد ومنحه درجة ممتازة.",
        readingTimeSeconds: 120,
        questionTimeSeconds: 360,
        questions: {
          create: [
            { prompt: "أين ذهب أحمد؟", options: JSON.stringify(["إلى المكتبة", "إلى المدرسة", "إلى البيت", "إلى السوق"]), correctIndex: 0, orderIndex: 0 },
            { prompt: "ما موضوع الكتاب الذي استعاره؟", options: JSON.stringify(["التاريخ العربي", "الرياضيات", "العلوم", "الأدب"]), correctIndex: 0, orderIndex: 1 },
            { prompt: "كم استغرق أحمد لقراءة الكتاب؟", options: JSON.stringify(["أسبوع واحد", "يومين", "شهر", "ثلاثة أيام"]), correctIndex: 0, orderIndex: 2 },
            { prompt: "ماذا قرر أحمد أن يفعل؟", options: JSON.stringify(["يكتب تقريراً", "يشتري الكتاب", "يرجع الكتاب", "يقرأ كتاباً آخر"]), correctIndex: 0, orderIndex: 3 },
            { prompt: "كيف كان شعور المعلم؟", options: JSON.stringify(["سعيداً", "غاضباً", "حزيناً", "متفاجئاً"]), correctIndex: 0, orderIndex: 4 },
            { prompt: "ما الدرجة التي حصل عليها أحمد؟", options: JSON.stringify(["ممتازة", "جيدة", "متوسطة", "ضعيفة"]), correctIndex: 0, orderIndex: 5 },
          ],
        },
      },
    });
    console.log(`✅ Short reading passage seeded (${shortPassage.id})`);

    // Medium passage
    const mediumPassage = await prisma.readingPassage.create({
      data: {
        difficulty: "medium",
        passageType: "medium",
        text: "تعتبر اللغة العربية واحدة من أقدم اللغات في العالم وأكثرها انتشاراً. يتحدث بها أكثر من أربعمائة مليون شخص حول العالم. وهي اللغة الرسمية في اثنتين وعشرين دولة عربية، كما أنها إحدى اللغات الرسمية الست في الأمم المتحدة. تتميز اللغة العربية بثراء مفرداتها وجمال أساليبها البلاغية. لقد كانت اللغة العربية لغة العلم والأدب والفلسفة في العصور الذهبية للحضارة الإسلامية، حيث ألّف العلماء العرب والمسلمون آلاف الكتب في مختلف العلوم. واليوم تشهد اللغة العربية اهتماماً متزايداً في جميع أنحاء العالم.",
        readingTimeSeconds: 180,
        questionTimeSeconds: 480,
        questions: {
          create: [
            { prompt: "كم عدد المتحدثين باللغة العربية تقريباً؟", options: JSON.stringify(["أكثر من 400 مليون", "100 مليون", "مليار", "50 مليون"]), correctIndex: 0, orderIndex: 0 },
            { prompt: "كم دولة تعتبر العربية لغتها الرسمية؟", options: JSON.stringify(["22", "15", "30", "10"]), correctIndex: 0, orderIndex: 1 },
            { prompt: "ما مكانة العربية في الأمم المتحدة؟", options: JSON.stringify(["لغة رسمية", "لغة ثانوية", "غير معترف بها", "لغة مراقب"]), correctIndex: 0, orderIndex: 2 },
            { prompt: "بماذا تتميز اللغة العربية؟", options: JSON.stringify(["ثراء المفردات والبلاغة", "سهولة النطق", "قلة القواعد", "بساطة الكتابة"]), correctIndex: 0, orderIndex: 3 },
            { prompt: "ماذا ألّف العلماء في العصور الذهبية؟", options: JSON.stringify(["آلاف الكتب", "قصائد فقط", "روايات فقط", "مسرحيات"]), correctIndex: 0, orderIndex: 4 },
            { prompt: "ما حال اللغة العربية اليوم؟", options: JSON.stringify(["تشهد اهتماماً متزايداً", "في تراجع", "مهملة", "ثابتة"]), correctIndex: 0, orderIndex: 5 },
            { prompt: "في أي عصر كانت العربية لغة العلم؟", options: JSON.stringify(["العصور الذهبية الإسلامية", "العصر الحديث", "العصر الجاهلي", "العصر الروماني"]), correctIndex: 0, orderIndex: 6 },
            { prompt: "ما الوصف الأنسب للغة العربية حسب النص؟", options: JSON.stringify(["قديمة ومنتشرة", "حديثة ومحدودة", "صعبة وبسيطة", "غامضة ونادرة"]), correctIndex: 0, orderIndex: 7 },
          ],
        },
      },
    });
    console.log(`✅ Medium reading passage seeded (${mediumPassage.id})`);
  }

  // ══════════════════════════════════════════════════
  // 4. Create/update admin user
  // ══════════════════════════════════════════════════
  const ADMIN_EMAIL = "muslimjon3396@gmail.com";
  const existingAdmin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existingAdmin) {
    // Mavjud foydalanuvchini admin qilish
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { isAdmin: true },
    });
    console.log(`✅ ${ADMIN_EMAIL} admin qilib belgilandi`);
  } else {
    // Yangi admin yaratish (Google orqali kirganda ishlaydi)
    const passwordHash = await bcrypt.hash("Admin123!", 10);
    const adminUser = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        fullName: "Zarifjon Gulomov",
        passwordHash,
        isAdmin: true,
        subscriptionTier: "FREE",
        languagePreference: "uz",
      },
    });
    await prisma.userProgress.create({
      data: { userId: adminUser.id },
    });
    console.log(`✅ Admin user yaratildi: ${ADMIN_EMAIL} (parol: Admin123!)`);
  }

  console.log("🎉 Seed completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
