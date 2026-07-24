/**
 * Tinglab tushunish — OSON daraja (short_dialogue bosqichi).
 *
 * 20 ta qisqa dialog (2–4 replika, 30–45 so'z), A1–A2 daraja.
 * Har bir savolning `lines` maydoni audio uchun manba — DB'da saqlanmaydi.
 * `scripts/generate-listening-audio.ts` uni o'qib, har spikerni alohida ovoz bilan
 * ElevenLabs orqali generatsiya qiladi va segmentlarni birlashtiradi.
 *
 * Spiker konvensiyasi: A = erkak, B = ayol.
 *
 * Ishga tushirish:  npx tsx prisma/seed-listening-easy.ts
 * Idempotent: avval shu bosqichdagi `easy` savollar o'chiriladi, keyin qaytadan yoziladi.
 */
import { PrismaClient } from "@prisma/client";
import { pathToFileURL } from "url";
import {
    audioUrlFromMap,
    loadAudioMap,
    MAX_PLAYS_BY_DIFFICULTY,
    STAGE_DEFAULTS,
    validateItems,
    type ListeningItem,
} from "./listening-common.js";

const DIFFICULTY = "easy" as const;

/** Transkript + savollar. TTS skripti ham, seed ham AYNAN shu massivdan foydalanadi. */
export const listeningEasyItems: ListeningItem[] = [
    // ── 1. Salomlashish ────────────────────────────────────
    {
        lines: [
            { speaker: "A", text: "صَباحَ الخَيرِ يا سارَة، كَيفَ حالُكِ اليَوم؟" },
            { speaker: "B", text: "صَباحَ النّورِ يا خالِد، أَنا بِخَيرٍ وَالحَمدُ لِلّه." },
            { speaker: "A", text: "هَل أَنتِ ذاهِبَةٌ إِلى الجامِعَة؟" },
            { speaker: "B", text: "نَعَم، عِندي مُحاضَرَةٌ في السّاعَةِ التّاسِعَة." },
        ],
        prompt: "مَتى مُحاضَرَةُ المَرأَة؟",
        options: ["في السّاعَةِ الثّامِنَة", "في السّاعَةِ التّاسِعَة", "في السّاعَةِ العاشِرَة", "في السّاعَةِ الحادِيَةَ عَشرَة"],
        correctIndex: 1,
    },
    // ── 2. Do'kon: non ─────────────────────────────────────
    {
        lines: [
            { speaker: "B", text: "مِن فَضلِك، كَم ثَمَنُ هذا الخُبز؟" },
            { speaker: "A", text: "ثَمَنُ الرَّغيفِ الواحِدِ نِصفُ دينار." },
            { speaker: "B", text: "أُريدُ أَربَعَةَ أَرغِفَةٍ وَزُجاجَةَ حَليب." },
            { speaker: "A", text: "تَفَضَّلي، المَجموعُ ثَلاثَةُ دَنانير." },
        ],
        prompt: "كَم رَغيفًا اشتَرَتِ المَرأَة؟",
        options: ["رَغيفَين", "ثَلاثَةَ أَرغِفَة", "أَربَعَةَ أَرغِفَة", "خَمسَةَ أَرغِفَة"],
        correctIndex: 2,
    },
    // ── 3. Oila ────────────────────────────────────────────
    {
        lines: [
            { speaker: "A", text: "هَل لَدَيكِ إِخوَةٌ يا لَيلى؟" },
            { speaker: "B", text: "نَعَم، لي أَخَوانِ وَأُختٌ واحِدَة." },
            { speaker: "A", text: "وَماذا يَعمَلُ أَخوكِ الكَبير؟" },
            { speaker: "B", text: "هُوَ طَبيبٌ في مُستَشفى المَدينَة." },
        ],
        prompt: "ماذا يَعمَلُ أَخو لَيلى الكَبير؟",
        options: ["مُهَندِس", "طَبيب", "مُعَلِّم", "تاجِر"],
        correctIndex: 1,
    },
    // ── 4. Vaqt ────────────────────────────────────────────
    {
        lines: [
            { speaker: "B", text: "عَفوًا، كَمِ السّاعَةُ الآن؟" },
            { speaker: "A", text: "السّاعَةُ الرّابِعَةُ وَالرُّبع." },
            { speaker: "B", text: "شُكرًا، القِطارُ يَتَحَرَّكُ في الخامِسَةِ تَمامًا." },
            { speaker: "A", text: "إِذَن أَمامَكِ خَمسٌ وَأَربَعونَ دَقيقَة." },
        ],
        prompt: "كَم دَقيقَةً بَقِيَت قَبلَ تَحَرُّكِ القِطار؟",
        options: ["خَمسَ عَشرَةَ دَقيقَة", "ثَلاثونَ دَقيقَة", "خَمسٌ وَأَربَعونَ دَقيقَة", "سِتّونَ دَقيقَة"],
        correctIndex: 2,
    },
    // ── 5. Ob-havo ─────────────────────────────────────────
    {
        lines: [
            { speaker: "A", text: "كَيفَ الطَّقسُ في الخارِج؟" },
            { speaker: "B", text: "بارِدٌ جِدًّا، وَالمَطَرُ يَنزِلُ مُنذُ الصَّباح." },
            { speaker: "A", text: "إِذَن سَآخُذُ المِظَلَّةَ وَالمِعطَفَ مَعي." },
            { speaker: "B", text: "فِكرَةٌ جَيِّدَة، لا تَنسَ المِظَلَّة." },
        ],
        prompt: "لِماذا يَأخُذُ الرَّجُلُ المِظَلَّة؟",
        options: ["لِأَنَّ الجَوَّ حارّ", "لِأَنَّ المَطَرَ يَنزِل", "لِأَنَّ الرِّيحَ قَوِيَّة", "لِأَنَّ الشَّمسَ ساطِعَة"],
        correctIndex: 1,
    },
    // ── 6. Yo'l so'rash ────────────────────────────────────
    {
        lines: [
            { speaker: "B", text: "مِن فَضلِك، أَينَ يَقَعُ مَكتَبُ البَريد؟" },
            { speaker: "A", text: "اِمشي مُستَقيمَةً ثُمَّ انعَطِفي يَمينًا عِندَ الصَّيدَلِيَّة." },
            { speaker: "B", text: "هَل هُوَ بَعيدٌ عَن هُنا؟" },
            { speaker: "A", text: "لا، عَشرُ دَقائِقَ سَيرًا عَلى الأَقدام." },
        ],
        prompt: "أَينَ تَنعَطِفُ المَرأَةُ يَمينًا؟",
        options: ["عِندَ المَدرَسَة", "عِندَ الصَّيدَلِيَّة", "عِندَ المَسجِد", "عِندَ البَنك"],
        correctIndex: 1,
    },
    // ── 7. Restoran ────────────────────────────────────────
    {
        lines: [
            { speaker: "A", text: "ماذا تُحِبّينَ أَن تَطلُبي؟" },
            { speaker: "B", text: "أُريدُ دَجاجًا مَشوِيًّا مَعَ الأَرُزِّ وَالسَّلَطَة." },
            { speaker: "A", text: "وَأَنا سَأَطلُبُ سَمَكًا وَعَصيرَ بُرتُقال." },
            { speaker: "B", text: "وَالحِسابُ عَلَيَّ اليَوم." },
        ],
        prompt: "ماذا طَلَبَ الرَّجُل؟",
        options: ["دَجاجًا مَشوِيًّا", "لَحمًا مَعَ الأَرُزّ", "سَمَكًا وَعَصيرَ بُرتُقال", "سَلَطَةً فَقَط"],
        correctIndex: 2,
    },
    // ── 8. Telefon: shifokorga navbat ──────────────────────
    {
        lines: [
            { speaker: "B", text: "أَلو، صَباحَ الخَير، هَل هذا مَكتَبُ الدُّكتور سَمير؟" },
            { speaker: "A", text: "نَعَم، كَيفَ أُساعِدُك؟" },
            { speaker: "B", text: "أُريدُ مَوعِدًا يَومَ الأَربِعاء." },
            { speaker: "A", text: "الأَربِعاءُ مُمتَلِئ، لكِن يوجَدُ مَوعِدٌ يَومَ الخَميسِ صَباحًا." },
        ],
        prompt: "مَتى المَوعِدُ المُتاح؟",
        options: ["يَومَ الثُّلاثاء", "يَومَ الأَربِعاء", "يَومَ الخَميس", "يَومَ الجُمُعَة"],
        correctIndex: 2,
    },
    // ── 9. Maktab ──────────────────────────────────────────
    {
        lines: [
            { speaker: "A", text: "ماذا دَرَستُم اليَومَ في الصَّفّ؟" },
            { speaker: "B", text: "دَرَسنا دَرسًا جَديدًا في الرِّياضِيّات." },
            { speaker: "A", text: "هَل كانَ صَعبًا؟" },
            { speaker: "B", text: "قَليلًا، لكِنَّ المُعَلِّمَةَ شَرَحَتهُ جَيِّدًا." },
        ],
        prompt: "أَيَّ مادَّةٍ دَرَسَتِ المَرأَةُ اليَوم؟",
        options: ["اللُّغَةَ العَرَبِيَّة", "الرِّياضِيّات", "التّاريخ", "العُلوم"],
        correctIndex: 1,
    },
    // ── 10. Taksi ──────────────────────────────────────────
    {
        lines: [
            { speaker: "B", text: "إِلى المَطارِ مِن فَضلِك، وَأَنا مُستَعجِلَة." },
            { speaker: "A", text: "تَفَضَّلي، الطَّريقُ مُزدَحِمٌ قَليلًا هذا الصَّباح." },
            { speaker: "B", text: "كَم نَحتاجُ مِنَ الوَقت؟" },
            { speaker: "A", text: "حَوالَي ثَلاثينَ دَقيقَةً إِن شاءَ الله." },
        ],
        prompt: "إِلى أَينَ تَذهَبُ المَرأَة؟",
        options: ["إِلى المَحَطَّة", "إِلى المَطار", "إِلى الفُندُق", "إِلى السّوق"],
        correctIndex: 1,
    },
    // ── 11. Kutubxona ──────────────────────────────────────
    {
        lines: [
            { speaker: "A", text: "أُريدُ أَن أَستَعيرَ كِتابًا عَنِ التّاريخِ الإِسلامي." },
            { speaker: "B", text: "الكُتُبُ التّاريخِيَّةُ في الطّابِقِ الثّاني." },
            { speaker: "A", text: "كَم يَومًا يُمكِنُني أَن أَحتَفِظَ بِالكِتاب؟" },
            { speaker: "B", text: "أُسبوعان، ثُمَّ يَجِبُ إِرجاعُه." },
        ],
        prompt: "كَم مُدَّةُ استِعارَةِ الكِتاب؟",
        options: ["ثَلاثَةُ أَيّام", "أُسبوعٌ واحِد", "أُسبوعان", "شَهرٌ كامِل"],
        correctIndex: 2,
    },
    // ── 12. Bozor: mevalar ─────────────────────────────────
    {
        lines: [
            { speaker: "B", text: "هَل عِندَكَ تُفّاحٌ طازِج؟" },
            { speaker: "A", text: "نَعَم، وَصَلَ اليَومَ مِنَ المَزرَعَة." },
            { speaker: "B", text: "أَعطِني كيلوغرامَينِ مِنَ التُّفّاحِ وَكيلوغرامًا مِنَ المَوز." },
            { speaker: "A", text: "حاضِر، هَل تُريدينَ شَيئًا آخَر؟" },
        ],
        prompt: "كَم كيلوغرامًا مِنَ التُّفّاحِ طَلَبَتِ المَرأَة؟",
        options: ["كيلوغرامًا واحِدًا", "كيلوغرامَين", "ثَلاثَةَ كيلوغرامات", "نِصفَ كيلوغرام"],
        correctIndex: 1,
    },
    // ── 13. Uy: kalitlar ───────────────────────────────────
    {
        lines: [
            { speaker: "A", text: "هَل رَأَيتِ مَفاتيحَ السَّيّارَة؟" },
            { speaker: "B", text: "نَعَم، هِيَ عَلى الطّاوِلَةِ في المَطبَخ." },
            { speaker: "A", text: "شُكرًا، كُنتُ أَبحَثُ عَنها مُنذُ عَشرِ دَقائِق." },
            { speaker: "B", text: "ضَعها دائِمًا في مَكانٍ واحِدٍ يا خالِد." },
        ],
        prompt: "أَينَ كانَت مَفاتيحُ السَّيّارَة؟",
        options: ["في غُرفَةِ النَّوم", "عَلى الطّاوِلَةِ في المَطبَخ", "داخِلَ السَّيّارَة", "في الحَقيبَة"],
        correctIndex: 1,
    },
    // ── 14. Sport ──────────────────────────────────────────
    {
        lines: [
            { speaker: "B", text: "مَتى تَذهَبُ إِلى النّادي عادَةً؟" },
            { speaker: "A", text: "أَذهَبُ ثَلاثَ مَرّاتٍ في الأُسبوعِ بَعدَ العَمَل." },
            { speaker: "B", text: "وَأَيَّ رِياضَةٍ تُمارِس؟" },
            { speaker: "A", text: "أَسبَحُ وَأَجري قَليلًا عَلى الجِهاز." },
        ],
        prompt: "كَم مَرَّةً يَذهَبُ الرَّجُلُ إِلى النّادي في الأُسبوع؟",
        options: ["مَرَّةً واحِدَة", "مَرَّتَين", "ثَلاثَ مَرّات", "كُلَّ يَوم"],
        correctIndex: 2,
    },
    // ── 15. Kiyim do'koni ──────────────────────────────────
    {
        lines: [
            { speaker: "B", text: "أَبحَثُ عَن قَميصٍ أَزرَقَ لِزَوجي." },
            { speaker: "A", text: "عِندَنا قُمصانٌ زَرقاءُ بِمَقاساتٍ مُختَلِفَة." },
            { speaker: "B", text: "أُريدُ المَقاسَ الكَبير." },
            { speaker: "A", text: "تَفَضَّلي، هذا آخِرُ قَميصٍ كَبيرٍ عِندَنا." },
        ],
        prompt: "ما لَونُ القَميصِ الَّذي تُريدُهُ المَرأَة؟",
        options: ["أَحمَر", "أَخضَر", "أَزرَق", "أَبيَض"],
        correctIndex: 2,
    },
    // ── 16. Safar ──────────────────────────────────────────
    {
        lines: [
            { speaker: "A", text: "مَتى تُسافِرينَ إِلى القاهِرَة؟" },
            { speaker: "B", text: "يَومَ السَّبتِ بِالطّائِرَة، وَأَبقى هُناكَ أُسبوعًا." },
            { speaker: "A", text: "هَل تُسافِرينَ لِلعَمَلِ أَم لِلزِّيارَة؟" },
            { speaker: "B", text: "لِزِيارَةِ خالَتي، فَأَنا لَم أَرَها مُنذُ سَنَتَين." },
        ],
        prompt: "لِماذا تُسافِرُ المَرأَةُ إِلى القاهِرَة؟",
        options: ["لِلعَمَل", "لِلدِّراسَة", "لِزِيارَةِ خالَتِها", "لِلعِلاج"],
        correctIndex: 2,
    },
    // ── 17. Bayram ─────────────────────────────────────────
    {
        lines: [
            { speaker: "B", text: "كَيفَ قَضَيتُم عيدَ الفِطر؟" },
            { speaker: "A", text: "صَلَّينا في المَسجِدِ ثُمَّ زُرنا الأَقارِب." },
            { speaker: "B", text: "وَهَل أَعَدَّت والِدَتُكَ الحَلوى؟" },
            { speaker: "A", text: "نَعَم، أَعَدَّت كَعكًا لَذيذًا لِلضُّيوف." },
        ],
        prompt: "ماذا فَعَلَ الرَّجُلُ وَأُسرَتُهُ بَعدَ الصَّلاة؟",
        options: ["ذَهَبوا إِلى السّوق", "زاروا الأَقارِب", "سافَروا إِلى القَريَة", "ناموا في البَيت"],
        correctIndex: 1,
    },
    // ── 18. Salomatlik ─────────────────────────────────────
    {
        lines: [
            { speaker: "A", text: "أَشعُرُ بِأَلَمٍ في رَأسي مُنذُ أَمس." },
            { speaker: "B", text: "هَل عِندَكَ حَرارَة؟" },
            { speaker: "A", text: "لا، لكِنّي لَم أَنَم جَيِّدًا." },
            { speaker: "B", text: "اِشرَب ماءً كَثيرًا وَنَم مُبَكِّرًا اللَّيلَة." },
        ],
        prompt: "بِماذا نَصَحَتِ المَرأَةُ الرَّجُل؟",
        options: ["بِأَخذِ الدَّواء", "بِشُربِ الماءِ وَالنَّومِ مُبَكِّرًا", "بِزِيارَةِ الطَّبيبِ فَورًا", "بِالرّاحَةِ في العَمَل"],
        correctIndex: 1,
    },
    // ── 19. Pochta ─────────────────────────────────────────
    {
        lines: [
            { speaker: "B", text: "أُريدُ إِرسالَ هذا الطَّردِ إِلى تونِس." },
            { speaker: "A", text: "بِالبَريدِ العاديِّ أَمِ السَّريع؟" },
            { speaker: "B", text: "بِالسَّريعِ لَو سَمَحت، فَهُوَ هَدِيَّةُ عيدِ ميلاد." },
            { speaker: "A", text: "سَيَصِلُ خِلالَ ثَلاثَةِ أَيّام." },
        ],
        prompt: "مَتى يَصِلُ الطَّرد؟",
        options: ["خِلالَ يَومٍ واحِد", "خِلالَ ثَلاثَةِ أَيّام", "خِلالَ أُسبوع", "خِلالَ شَهر"],
        correctIndex: 1,
    },
    // ── 20. Ish: uchrashuv ─────────────────────────────────
    {
        lines: [
            { speaker: "A", text: "هَلِ اجتِماعُ الغَدِ في السّاعَةِ العاشِرَة؟" },
            { speaker: "B", text: "لا، تَأَجَّلَ إِلى الحادِيَةَ عَشرَةَ بِسَبَبِ سَفَرِ المُدير." },
            { speaker: "A", text: "شُكرًا لِإِخباري، سَأُعِدُّ التَّقريرَ قَبلَ ذلِك." },
            { speaker: "B", text: "مُمتاز، أَرسِلهُ لي بِالبَريدِ الإِلِكتروني." },
        ],
        prompt: "لِماذا تَأَجَّلَ الاجتِماع؟",
        options: ["بِسَبَبِ المَرَض", "بِسَبَبِ سَفَرِ المُدير", "بِسَبَبِ العُطلَة", "بِسَبَبِ الطَّقس"],
        correctIndex: 1,
    },
];

// PrismaClient faqat seed ishga tushganda yaratiladi — TTS skripti bu fayldan
// savollar massivini import qilganda DATABASE_URL talab qilinmasin.
async function main() {
    const prisma = new PrismaClient();
    console.log("🎧 Tinglash — OSON (short_dialogue) savollari qo'shilmoqda...");

    // 1) Validatsiya — noto'g'ri ma'lumot bazaga tushmasin.
    const errors = validateItems(DIFFICULTY, listeningEasyItems);
    if (errors.length > 0) {
        console.error("❌ Validatsiya xatolari:");
        errors.forEach((e) => console.error("   - " + e));
        process.exit(1);
    }
    console.log(`✅ Validatsiya: ${listeningEasyItems.length} ta savol, xato yo'q`);

    // 2) Audio xaritasini yuklaymiz — audioUrl faqat DO Spaces public URL bo'ladi.
    const audioMap = loadAudioMap();
    for (let i = 0; i < listeningEasyItems.length; i++) audioUrlFromMap(audioMap, DIFFICULTY, i); // yetishmagan kalit bo'lsa shu yerda to'xtaydi
    console.log(`🔗 Audio xaritasi tekshirildi: ${listeningEasyItems.length} ta URL topildi`);

    // 3) Stage'ni topamiz yoki yaratamiz.
    const def = STAGE_DEFAULTS[DIFFICULTY];
    const stage = await prisma.listeningStage.upsert({
        where: { stageType: def.stageType },
        update: {},
        create: def,
    });
    console.log(`📌 Bosqich: ${stage.stageType} (${stage.id})`);

    // 4) Idempotentlik: shu bosqichdagi eski `easy` savollarni o'chiramiz.
    const removed = await prisma.listeningQuestion.deleteMany({
        where: { stageId: stage.id, difficulty: DIFFICULTY },
    });
    console.log(`🗑  Eski savollar o'chirildi: ${removed.count} ta`);

    // 5) Yangi savollarni yozamiz.
    for (let i = 0; i < listeningEasyItems.length; i++) {
        const item = listeningEasyItems[i];
        await prisma.listeningQuestion.create({
            data: {
                stageId: stage.id,
                difficulty: DIFFICULTY,
                prompt: item.prompt,
                options: JSON.stringify(item.options),
                correctIndex: item.correctIndex,
                audioUrl: audioUrlFromMap(audioMap, DIFFICULTY, i),
                maxPlays: MAX_PLAYS_BY_DIFFICULTY[DIFFICULTY],
                orderIndex: i,
            },
        });
    }
    console.log(`✅ ${listeningEasyItems.length} ta OSON tinglash savoli qo'shildi`);
    console.log("ℹ️  Eslatma: audio fayllar oldindan generatsiya qilingan bo'lishi kerak:");
    console.log("   npx tsx scripts/generate-listening-audio.ts");

    await prisma.$disconnect();
}

// Faqat to'g'ridan-to'g'ri ishga tushirilganda seed qilamiz.
// TTS skripti bu fayldan faqat `listeningEasyItems` ni import qiladi — DB'ga tegmasin.
const isDirectRun = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
    main().catch((e) => {
        console.error(e instanceof Error ? e.message : e);
        process.exit(1);
    });
}
