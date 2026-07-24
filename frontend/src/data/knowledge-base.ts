/**
 * Ochiq bilim bazasi (SEO o'quv kontenti) ma'lumot modeli.
 *
 * Har bir dars — indekslanadigan, topikal jihatdan to'liq sahifaga
 * aylanadigan ma'lumot obyekti. Sahifa shabloni (LessonPage) ushbu
 * strukturadan barcha bloklarni (xulosa, maqsadlar, dars, misollar,
 * xatolar, FAQ, lug'at, bog'liq darslar, CTA + structured data)
 * generatsiya qiladi. Yangi dars qo'shish = shu massivga yozuv qo'shish.
 *
 * DIQQAT (E-E-A-T): arabcha kontent metodist/o'qituvchi tomonidan
 * ko'rib chiqilishi lozim. `author`/`reviewedBy` maydonlarini real
 * mutaxassis ismlari bilan to'ldirish qidiruv ishonchini kuchaytiradi.
 */

export interface FaqItem {
    question: string;
    answer: string;
}

export interface ExampleItem {
    /** Arabcha yozuv (RTL) */
    arabic: string;
    /** Lotin transliteratsiyasi */
    translit: string;
    /** O'zbekcha tarjima/izoh */
    uz: string;
}

export interface VocabItem {
    arabic: string;
    translit: string;
    uz: string;
}

export interface LessonSection {
    heading: string;
    /** Har element — alohida paragraf */
    body: string[];
}

export interface RelatedLink {
    title: string;
    /** Ichki slug (/organ/<slug>) yoki to'liq yo'l */
    slug: string;
}

export interface KbLesson {
    slug: string;
    /** H1 va meta uchun asosiy sarlavha */
    title: string;
    /** <title> uchun (brend keyin qo'shiladi) */
    metaTitle: string;
    /** Noyob meta description (~150 belgigacha) */
    description: string;
    /** Klaster nomi (breadcrumb + guruhlash) */
    cluster: string;
    /** CEFR daraja, masalan "A1" */
    level: string;
    /** ISO sana — oxirgi yangilanish */
    updated: string;
    /** Taxminiy o'qish vaqti (daqiqa) */
    readingMinutes: number;
    /** Javob-birinchi xulosa (40–60 so'z) — AI iqtibos bloki */
    summary: string;
    objectives: string[];
    prerequisites: string[];
    sections: LessonSection[];
    examples: ExampleItem[];
    commonMistakes: string[];
    vocabulary: VocabItem[];
    faq: FaqItem[];
    related: RelatedLink[];
    /** Konvertatsion chaqiruv */
    cta: { heading: string; text: string; href: string; label: string };
    /** Muallif bloki (E-E-A-T) */
    author: string;
    reviewedBy?: string;
}

/** Bilim bazasi darslari. Yangi dars = yangi yozuv. */
export const kbLessons: KbLesson[] = [
    {
        slug: "arab-alifbosi",
        title: "Arab alifbosi: 28 harf va ularni qanday o'qish kerak",
        metaTitle: "Arab alifbosi — 28 harf, o'qilishi va yozilishi",
        description:
            "Arab alifbosidagi 28 harf, ularning o'qilishi, yozuv shakllari va o'ngdan chapga yozuv qoidalari. Boshlang'ich (A1) uchun to'liq qo'llanma va misollar.",
        cluster: "Alifbo va yozuv",
        level: "A1",
        updated: "2026-07-24",
        readingMinutes: 8,
        summary:
            "Arab alifbosida 28 ta harf bor va yozuv o'ngdan chapga ketadi. Bosh harflar yo'q, lekin har bir harf so'zdagi o'rniga qarab (boshda, o'rtada, oxirida yoki yakka) shaklini o'zgartiradi. Harflarning tovushi ustidagi harakatlar bilan aniqlanadi.",
        objectives: [
            "28 arab harfini va ularning nomlarini tanib olish",
            "Yozuv yo'nalishi va harflarning ulanish qoidasini tushunish",
            "Harfning to'rt shaklini (boshi, o'rtasi, oxiri, yakka) farqlash",
            "Oddiy arabcha so'zlarni harflarga ajratib o'qishga tayyorgarlik",
        ],
        prerequisites: [
            "Maxsus bilim talab qilinmaydi — bu eng boshlang'ich dars",
            "Yozuvni mashq qilish uchun daftar va qalam tavsiya etiladi",
        ],
        sections: [
            {
                heading: "Arab yozuvining asosiy xususiyatlari",
                body: [
                    "Arab yozuvi o'zbek (lotin/kirill) yozuvidan bir necha muhim jihati bilan farq qiladi. Birinchidan, yozuv o'ngdan chapga ketadi. Ikkinchidan, arab alifbosida bosh harf va kichik harf tushunchasi yo'q — har bir harfning bitta asosiy shakli bor.",
                    "Uchinchidan, arab yozuvi ulama (kursiv) yozuv: so'z ichidagi harflar bir-biriga qo'shilib yoziladi. Shu sababli aksariyat harflar so'zdagi o'rniga qarab to'rt xil ko'rinishga ega bo'ladi: so'z boshida, o'rtasida, oxirida va yakka holatda.",
                ],
            },
            {
                heading: "28 harf va ulanmaydigan harflar",
                body: [
                    "Alifbo alif (ا) harfidan boshlanadi va ya (ي) harfi bilan tugaydi. 28 harfning aksariyati o'zidan keyingi harfga qo'shiladi, lekin oltita harf — alif (ا), dol (د), zol (ذ), ro (ر), zey (ز) va vov (و) — faqat o'zidan oldingi harfga qo'shiladi, keyingisiga qo'shilmaydi.",
                    "Bu qoidani bilish o'qishni ancha osonlashtiradi: agar shu oltita harfdan biriga duch kelsangiz, undan keyin so'zda uzilish bo'lishini bilib olasiz.",
                ],
            },
            {
                heading: "Harflarning to'rt shakli",
                body: [
                    "Masalan, «ayn» harfini olaylik. Yakka holatda ﻉ, so'z boshida ﻋ, o'rtasida ﻌ, oxirida ﻊ shaklida yoziladi. Shakl o'zgarsa ham tovush bir xil qoladi — faqat ulanish nuqtalari o'zgaradi.",
                    "Boshlanuvchilar uchun maslahat: avval harflarni yakka holatda tanib oling, keyin ularning so'z ichidagi ulangan shakllarini o'rganing.",
                ],
            },
        ],
        examples: [
            { arabic: "بَاب", translit: "bāb", uz: "eshik" },
            { arabic: "كِتَاب", translit: "kitāb", uz: "kitob" },
            { arabic: "قَلَم", translit: "qalam", uz: "qalam (ruchka)" },
            { arabic: "بَيْت", translit: "bayt", uz: "uy" },
            { arabic: "مَاء", translit: "māʼ", uz: "suv" },
        ],
        commonMistakes: [
            "Harflarni chapdan o'ngga o'qishga urinish — arab yozuvi doim o'ngdan chapga.",
            "Ulanmaydigan olti harfdan (ا د ذ ر ز و) keyin harflarni majburan qo'shishga urinish.",
            "Bir xil ko'rinadigan, faqat nuqtasi bilan farq qiladigan harflarni (masalan ب / ت / ث) chalkashtirish.",
            "Harakatlarni (unli belgilar) e'tibordan chetda qoldirish — ularsiz so'z noto'g'ri o'qiladi.",
        ],
        vocabulary: [
            { arabic: "حَرْف", translit: "ḥarf", uz: "harf" },
            { arabic: "كَلِمَة", translit: "kalima", uz: "so'z" },
            { arabic: "أَلِف", translit: "alif", uz: "alif (birinchi harf)" },
            { arabic: "كِتَابَة", translit: "kitāba", uz: "yozuv" },
        ],
        faq: [
            {
                question: "Arab alifbosida nechta harf bor?",
                answer:
                    "Arab alifbosida 28 ta asosiy harf bor. Yozuv o'ngdan chapga ketadi va bosh harf tushunchasi yo'q.",
            },
            {
                question: "Nega arab harflari turli xil ko'rinadi?",
                answer:
                    "Arab yozuvi kursiv — harflar bir-biriga qo'shiladi. Shuning uchun aksariyat harf so'zdagi o'rniga qarab to'rt shaklga ega: boshi, o'rtasi, oxiri va yakka holat.",
            },
            {
                question: "Arab alifbosini o'rganish qancha vaqt oladi?",
                answer:
                    "Kuniga 20–30 daqiqa muntazam mashq qilinsa, ko'pchilik 1–2 hafta ichida 28 harfni tanib, oddiy so'zlarni o'qiy boshlaydi.",
            },
            {
                question: "Alifboni bilsam, arabcha o'qiy olamanmi?",
                answer:
                    "Harflarni bilish birinchi qadam. To'g'ri o'qish uchun harakatlar (unli belgilar)ni ham o'rganishingiz kerak — bu keyingi darsning mavzusi.",
            },
        ],
        related: [
            { title: "Arab tili harakatlari: fatha, kasra, damma", slug: "arab-harakatlari" },
            { title: "Bilim bazasi — barcha darslar", slug: "" },
        ],
        cta: {
            heading: "Bilimingizni sinab ko'ring",
            text: "Arab tili darajangizni aniqlash va CEFR mock imtihonini topshirish uchun ro'yxatdan o'ting.",
            href: "/register",
            label: "Bepul boshlash",
        },
        author: "Arab Exam metodika jamoasi",
    },
    {
        slug: "arab-harakatlari",
        title: "Arab tili harakatlari: fatha, kasra, damma va sukun",
        metaTitle: "Arab harakatlari — fatha, kasra, damma, sukun",
        description:
            "Arab tilidagi harakatlar (fatha, kasra, damma, sukun, shadda, tanvin) nima va ular so'z o'qilishini qanday belgilaydi. A1 daraja uchun misollar bilan qo'llanma.",
        cluster: "Alifbo va yozuv",
        level: "A1",
        updated: "2026-07-24",
        readingMinutes: 7,
        summary:
            "Harakatlar — arab harflari ustiga yoki ostiga qo'yiladigan unli belgilar. Fatha «a», kasra «i», damma «u» tovushini beradi; sukun unli yo'qligini bildiradi. Ular so'zning to'g'ri o'qilishini belgilaydi va boshlang'ich bosqichda o'ta muhim.",
        objectives: [
            "Uch asosiy harakatni (fatha, kasra, damma) tanib olish va farqlash",
            "Sukun, shadda va tanvin belgilarining vazifasini tushunish",
            "Harakatli so'zlarni to'g'ri unli bilan o'qish",
        ],
        prerequisites: [
            "Arab alifbosi (28 harf) bilan tanish bo'lish",
        ],
        sections: [
            {
                heading: "Nega harakatlar kerak?",
                body: [
                    "Arab yozuvida unli tovushlar odatda alohida harf bilan emas, balki harakat deb ataladigan kichik belgilar bilan ko'rsatiladi. Harakatlar harfning ustiga yoki ostiga qo'yiladi va harfdan keyin qanday unli kelishini bildiradi.",
                    "Kundalik matnlarda (gazeta, kitob) harakatlar ko'pincha yozilmaydi, chunki arab tilida so'zovchilar so'zni kontekstdan taniydi. Ammo boshlang'ich o'quvchi va Qur'on matnlarida harakatlar to'liq qo'yiladi.",
                ],
            },
            {
                heading: "Uch asosiy harakat",
                body: [
                    "Fatha — harf ustiga qo'yiladigan qiya chiziqcha, «a» tovushini beradi (بَ = ba). Kasra — harf ostiga qo'yiladigan chiziqcha, «i» tovushini beradi (بِ = bi). Damma — harf ustiga qo'yiladigan kichik «vov»ga o'xshash belgi, «u» tovushini beradi (بُ = bu).",
                    "Bu uch belgi — arabcha o'qishning kaliti. Ularni yodlab olsangiz, istalgan harfni to'g'ri unli bilan o'qiy olasiz.",
                ],
            },
            {
                heading: "Sukun, shadda va tanvin",
                body: [
                    "Sukun — harf ustiga qo'yiladigan kichik doira, harfdan keyin unli yo'qligini bildiradi (بْ = sof «b»). Shadda — harf ustidagi kichik «w» shaklidagi belgi, harfning ikki marta (qo'sh) talaffuz qilinishini bildiradi.",
                    "Tanvin — so'z oxirida ikki fatha, ikki kasra yoki ikki damma ko'rinishida yoziladi va «-an», «-in», «-un» tovushini qo'shadi. Bu asosan noaniq (indefinite) otlarni bildiradi.",
                ],
            },
        ],
        examples: [
            { arabic: "بَ", translit: "ba", uz: "fatha — «a» tovushi" },
            { arabic: "بِ", translit: "bi", uz: "kasra — «i» tovushi" },
            { arabic: "بُ", translit: "bu", uz: "damma — «u» tovushi" },
            { arabic: "كَتَبَ", translit: "kataba", uz: "u (erkak) yozdi" },
            { arabic: "كُتِبَ", translit: "kutiba", uz: "yozildi" },
        ],
        commonMistakes: [
            "Fatha va kasrani chalkashtirish (biri ustida, biri ostida — o'rniga e'tibor bering).",
            "Shaddani e'tiborsiz qoldirish — u so'z ma'nosini o'zgartirishi mumkin.",
            "Sukunni unli deb o'qish — sukun aksincha, unli yo'qligini bildiradi.",
        ],
        vocabulary: [
            { arabic: "حَرَكَة", translit: "ḥaraka", uz: "harakat (unli belgi)" },
            { arabic: "فَتْحَة", translit: "fatḥa", uz: "fatha" },
            { arabic: "كَسْرَة", translit: "kasra", uz: "kasra" },
            { arabic: "ضَمَّة", translit: "ḍamma", uz: "damma" },
            { arabic: "سُكُون", translit: "sukūn", uz: "sukun" },
        ],
        faq: [
            {
                question: "Harakat nima?",
                answer:
                    "Harakat — arab harfi ustiga yoki ostiga qo'yiladigan kichik belgi bo'lib, harfdan keyin qanday unli (a, i, u) kelishini yoki unli yo'qligini (sukun) bildiradi.",
            },
            {
                question: "Fatha, kasra va damma farqi nima?",
                answer:
                    "Fatha «a» (harf ustida), kasra «i» (harf ostida), damma «u» (harf ustida vovsimon belgi) tovushini beradi.",
            },
            {
                question: "Nega ba'zi arabcha matnlarda harakatlar yo'q?",
                answer:
                    "Tajribali o'quvchilar so'zni kontekstdan taniganligi uchun kundalik matnlarda harakatlar odatda tushirib qoldiriladi. O'quv materiallari va Qur'onda esa to'liq yoziladi.",
            },
        ],
        related: [
            { title: "Arab alifbosi: 28 harf", slug: "arab-alifbosi" },
            { title: "Bilim bazasi — barcha darslar", slug: "" },
        ],
        cta: {
            heading: "Keyingi qadam",
            text: "Harflar va harakatlarni o'zlashtirdingizmi? CEFR darajangizni aniqlash uchun bepul demo imtihonni sinab ko'ring.",
            href: "/register",
            label: "Bepul demo",
        },
        author: "Arab Exam metodika jamoasi",
    },
];

export function getLessonBySlug(slug: string): KbLesson | undefined {
    return kbLessons.find((l) => l.slug === slug);
}
