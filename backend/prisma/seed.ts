// Arab Exam – Prisma schema
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Exam type: Arabic proficiency (e.g. TIL - Test of Arabic as Foreign Language style)
  const examType = await prisma.examType.upsert({
    where: { id: "exam-type-arabic-1" },
    update: {},
    create: {
      id: "exam-type-arabic-1",
      name: "Arabic Proficiency",
      description: "General Arabic language proficiency mock exam",
    },
  });

  // One section: Reading / MCQ
  const section = await prisma.examSection.upsert({
    where: { id: "section-reading-1" },
    update: {},
    create: {
      id: "section-reading-1",
      examTypeId: examType.id,
      name: "Reading",
      order: 1,
    },
  });

  // MCQ questions (no correctAnswer exposed to client; used only for grading)
  const questions = await Promise.all([
    prisma.question.upsert({
      where: { id: "q1" },
      update: {},
      create: {
        id: "q1",
        examSectionId: section.id,
        questionType: "MULTIPLE_CHOICE",
        questionText: "ما معنى كلمة «كتاب»؟",
        options: JSON.stringify(["book", "pen", "desk", "door"]),
        correctAnswer: "book",
        points: 1,
        order: 1,
      },
    }),
    prisma.question.upsert({
      where: { id: "q2" },
      update: {},
      create: {
        id: "q2",
        examSectionId: section.id,
        questionType: "MULTIPLE_CHOICE",
        questionText: "ما ضد كلمة «كبير»؟",
        options: JSON.stringify(["small", "big", "old", "new"]),
        correctAnswer: "small",
        points: 1,
        order: 2,
      },
    }),
    prisma.question.upsert({
      where: { id: "q3" },
      update: {},
      create: {
        id: "q3",
        examSectionId: section.id,
        questionType: "MULTIPLE_CHOICE",
        questionText: "اختر الجملة الصحيحة:",
        options: JSON.stringify([
          "أنا يذهب إلى المدرسة",
          "أنا أذهب إلى المدرسة",
          "أنا ذهب إلى المدرسة",
          "أنا ذاهب المدرسة",
        ]),
        correctAnswer: "أنا أذهب إلى المدرسة",
        points: 1,
        order: 3,
      },
    }),
    prisma.question.upsert({
      where: { id: "q4" },
      update: {},
      create: {
        id: "q4",
        examSectionId: section.id,
        questionType: "MULTIPLE_CHOICE",
        questionText: "ما جمع «طالب»؟",
        options: JSON.stringify(["طالبة", "طلاب", "مدرسة", "كتاب"]),
        correctAnswer: "طلاب",
        points: 1,
        order: 4,
      },
    }),
  ]);

  // Predefined mock exam (savollar DB da)
  await prisma.mockExam.upsert({
    where: { id: "mock-exam-1" },
    update: {},
    create: {
      id: "mock-exam-1",
      examTypeId: examType.id,
      title: "Arabic Proficiency – Mock 1",
      description: "Qisqa mashq (4 ta MCQ)",
      durationMinutes: 10,
      useAiGeneration: false,
    },
  });

  // AI orqali generatsiya qilinadigan mock exam
  await prisma.mockExam.upsert({
    where: { id: "mock-exam-ai-1" },
    update: {},
    create: {
      id: "mock-exam-ai-1",
      examTypeId: examType.id,
      title: "Arab tili – AI Mock imtihon",
      description: "Har safar AI tomonidan yangi savollar bilan (10 ta MCQ). CEFR darajasi AI baholashi bilan.",
      durationMinutes: 15,
      useAiGeneration: true,
      numberOfQuestions: 10,
    },
  });

  // CEFR to'liq imtihon (Listening, Reading, Language Use, Writing, Speaking) – daraja body da
  await prisma.mockExam.upsert({
    where: { id: "cefr-full" },
    update: {},
    create: {
      id: "cefr-full",
      examTypeId: examType.id,
      title: "CEFR to'liq imtihon",
      description: "A1–C2 daraja tanlang. 5 bo'lim: Listening, Reading, Language Use, Writing, Speaking. Professional format, fus'ha.",
      durationMinutes: 120,
      useAiGeneration: true,
      numberOfQuestions: null,
    },
  });

  // SQLite does not support skipDuplicates in createMany, using upsert loop instead
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    await prisma.mockExamQuestion.upsert({
      where: {
        mockExamId_questionId: {
          mockExamId: "mock-exam-1",
          questionId: q.id,
        },
      },
      update: {},
      create: {
        mockExamId: "mock-exam-1",
        questionId: q.id,
        order: i + 1,
      },
    });
  }

  const bankItems: Array<{ id: string; level: string; section: string; taskType: string; prompt: string; options: string[]; correctAnswer: string; transcript?: string; passage?: string; difficulty: number; tags: object }> = [];
  const levels = ["A1", "B1", "C1"] as const;
  const sections = ["listening", "reading", "language_use"] as const;
  const prompts: Record<string, Record<string, Array<{ prompt: string; options: string[]; correctAnswer: string; transcript?: string; passage?: string }>>> = {
    A1: {
      listening: [
        { prompt: "ما معنى كلمة «كتاب»؟", options: ["كتاب", "قلم", "مكتب", "باب"], correctAnswer: "كتاب", transcript: "الكتاب على الطاولة." },
        { prompt: "أين الكتاب؟", options: ["على الطاولة", "تحت الكرسي", "في الحقيبة"], correctAnswer: "على الطاولة", transcript: "الكتاب على الطاولة." },
        ...Array.from({ length: 14 }, (_, i) => ({ prompt: `سؤال استماع A1 ${i + 3}`, options: ["أ", "ب", "ج", "د"], correctAnswer: "أ", transcript: "نص قصير." })),
      ],
      reading: [
        { prompt: "ما ضد «كبير»؟", options: ["صغير", "كبير", "قديم"], correctAnswer: "صغير", passage: "الأب كبير والابن صغير." },
        ...Array.from({ length: 15 }, (_, i) => ({ prompt: `سؤال قراءة A1 ${i + 2}`, options: ["أ", "ب", "ج", "د"], correctAnswer: "أ", passage: "نص." })),
      ],
      language_use: [
        { prompt: "أنا ___ إلى المدرسة.", options: ["أذهب", "يذهب", "ذهب"], correctAnswer: "أذهب" },
        { prompt: "ما جمع «طالب»؟", options: ["طلاب", "طالبة", "مدرسة"], correctAnswer: "طلاب" },
        ...Array.from({ length: 14 }, (_, i) => ({ prompt: `سؤال لغة A1 ${i + 3}`, options: ["أ", "ب", "ج", "د"], correctAnswer: "أ" })),
      ],
    },
    B1: {
      listening: Array.from({ length: 18 }, (_, i) => ({ prompt: `سؤال استماع B1 ${i + 1}`, options: ["التعليم", "السفر", "الرياضة", "الطقس"], correctAnswer: "التعليم", transcript: "في العصر الحديث أصبح التعليم متاحاً." })),
      reading: Array.from({ length: 18 }, (_, i) => ({ prompt: `سؤال قراءة B1 ${i + 1}`, options: ["موجود وسهل الوصول", "غالي", "صعب"], correctAnswer: "موجود وسهل الوصول", passage: "أصبح التعليم متاحاً للجميع." })),
      language_use: Array.from({ length: 22 }, (_, i) => ({ prompt: `سؤال لغة B1 ${i + 1}`, options: ["يدرسون", "درسوا", "سيدرسون"], correctAnswer: "يدرسون" })),
    },
    C1: {
      listening: Array.from({ length: 20 }, (_, i) => ({ prompt: `سؤال استماع C1 ${i + 1}`, options: ["إيجابي مع التحفظ", "رفض تام", "حماس كامل"], correctAnswer: "إيجابي مع التحفظ", transcript: "التكنولوجيا أداة فعّالة." })),
      reading: Array.from({ length: 20 }, (_, i) => ({ prompt: `سؤال قراءة C1 ${i + 1}`, options: ["الاعتدال مطلوب", "الرفض أفضل", "القبول الأعمى"], correctAnswer: "الاعتدال مطلوب", passage: "التكنولوجيا أداة فعّالة وإن أُحسن استخدامها." })),
      language_use: Array.from({ length: 28 }, (_, i) => ({ prompt: `سؤال لغة C1 ${i + 1}`, options: ["مع", "بدون", "رغم"], correctAnswer: "مع" })),
    },
  };
  for (const level of levels) {
    for (const section of sections) {
      const list = prompts[level][section];
      list.forEach((q, idx) => {
        const sec = section === "language_use" ? "lu" : section.slice(0, 1);
        bankItems.push({
          id: `${level}-${sec}-${idx}`,
          level,
          section,
          taskType: "mcq",
          prompt: q.prompt,
          options: q.options,
          correctAnswer: q.correctAnswer,
          transcript: q.transcript,
          passage: q.passage,
          difficulty: level === "A1" ? 1 : level === "B1" ? 3 : 5,
          tags: {},
        });
      });
    }
  }
  for (const item of bankItems) {
    await prisma.questionBank.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        level: item.level,
        section: item.section,
        taskType: item.taskType,
        prompt: item.prompt,
        options: JSON.stringify(item.options),
        correctAnswer: item.correctAnswer, // correctAnswer is string in both
        transcript: "transcript" in item ? (item as { transcript?: string }).transcript : null,
        passage: "passage" in item ? (item as { passage?: string }).passage : null,
        difficulty: item.difficulty,
        tags: JSON.stringify(item.tags),
      },
    });
  }
  console.log("Seed completed: exam type, section, 4 questions, 3 mock exams, QuestionBank (A1/B1/C1).");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
