/**
 * Tinglab tushunish (listening) audiolarini generatsiya qiladi.
 *
 * OQIM:
 *   1. Uchala seed faylidan transkriptlarni import qiladi (DB'ga tegmaydi).
 *   2. Har bir savol uchun ElevenLabs TTS orqali mp3 yasaydi:
 *        - dialog (easy/medium): har replika o'z ovozi bilan (A=erkak, B=ayol),
 *          segmentlar ketma-ket birlashtiriladi;
 *        - monolog (hard): bitta narrator ovozi.
 *   3. Faylni DigitalOcean Spaces (S3) ga barqaror kalit bilan yuklaydi.
 *   4. Kalit → public URL xaritasini `prisma/listening-audio-map.json` ga yozadi.
 *      Seed skriptlar audioUrl'ni AYNAN shu xaritadan oladi.
 *
 * IDEMPOTENT: Spaces'da fayl allaqachon mavjud bo'lsa (HeadObject), qayta
 * generatsiya QILMAYDI — kredit tejaladi. `--force` bilan majburan qayta yasaydi.
 *
 * FLAGLAR:
 *   --dry-run   API'ni chaqirmasdan nechta fayl yaratilishini ko'rsatadi.
 *   --force     mavjud fayllarni ham qayta generatsiya qiladi.
 *   --only=easy|medium|hard   faqat bitta darajani ishlaydi.
 *
 * ISHGA TUSHIRISH:
 *   cd backend
 *   npx tsx scripts/generate-listening-audio.ts --dry-run
 *   npx tsx scripts/generate-listening-audio.ts            # haqiqiy generatsiya (kredit sarflaydi!)
 *
 * KERAKLI ENV (.env):
 *   ELEVENLABS_API_KEY   — ElevenLabs kaliti
 *   AWS_ENDPOINT, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY — DO Spaces
 */
import "dotenv/config";
import fs from "fs";

import { config } from "../src/config.js";
import {
    isObjectStorageEnabled,
    objectExistsInSpaces,
    publicUrlFor,
    uploadLocalFileToSpaces,
} from "../src/lib/s3.js";
import {
    audioMapPath,
    audioObjectKey,
    fullTranscript,
    loadAudioMapSafe,
    TTS_MODEL_ID,
    TTS_OUTPUT_FORMAT,
    TTS_SETTINGS,
    VOICES,
    type AudioMap,
    type ListeningDifficulty,
    type ListeningItem,
} from "../prisma/listening-common.js";

import { listeningEasyItems } from "../prisma/seed-listening-easy.js";
import { listeningMediumItems } from "../prisma/seed-listening-medium.js";
import { listeningHardItems } from "../prisma/seed-listening-hard.js";

const ELEVEN_BASE = "https://api.elevenlabs.io/v1/text-to-speech";

const DATASETS: { difficulty: ListeningDifficulty; items: ListeningItem[] }[] = [
    { difficulty: "easy", items: listeningEasyItems },
    { difficulty: "medium", items: listeningMediumItems },
    { difficulty: "hard", items: listeningHardItems },
];

interface Flags {
    dryRun: boolean;
    force: boolean;
    only: ListeningDifficulty | null;
}

function parseFlags(argv: string[]): Flags {
    const flags: Flags = { dryRun: false, force: false, only: null };
    for (const arg of argv) {
        if (arg === "--dry-run") flags.dryRun = true;
        else if (arg === "--force") flags.force = true;
        else if (arg.startsWith("--only=")) {
            const v = arg.slice("--only=".length);
            if (v === "easy" || v === "medium" || v === "hard") flags.only = v;
            else throw new Error(`--only faqat easy|medium|hard bo'lishi mumkin (kelgan: "${v}")`);
        } else if (arg.startsWith("--")) {
            throw new Error(`Noma'lum flag: ${arg}`);
        }
    }
    return flags;
}

/** ElevenLabs orqali bitta matndan mp3 buferini oladi. */
async function synthesize(text: string, voiceId: string, difficulty: ListeningDifficulty): Promise<Buffer> {
    const s = TTS_SETTINGS[difficulty];
    const url = `${ELEVEN_BASE}/${voiceId}?output_format=${TTS_OUTPUT_FORMAT}`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "xi-api-key": config.elevenLabsApiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
        },
        body: JSON.stringify({
            text,
            model_id: TTS_MODEL_ID,
            voice_settings: {
                stability: s.stability,
                similarity_boost: s.similarity_boost,
                style: s.style,
                use_speaker_boost: true,
                speed: s.speed,
            },
        }),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`ElevenLabs xatosi (${res.status}): ${body.slice(0, 300)}`);
    }
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
}

/**
 * Bitta savol uchun to'liq mp3 buferini yasaydi.
 * Dialogda har replika alohida generatsiya qilinib, segmentlar birlashtiriladi.
 * MP3 (CBR) segmentlarini to'g'ridan-to'g'ri ulash brauzerda muammosiz o'ynaydi.
 */
async function buildAudio(item: ListeningItem, difficulty: ListeningDifficulty): Promise<Buffer> {
    if (item.lines && item.lines.length > 0) {
        const segments: Buffer[] = [];
        for (const line of item.lines) {
            const voiceId = line.speaker === "A" ? VOICES.male : VOICES.female;
            segments.push(await synthesize(line.text, voiceId, difficulty));
        }
        return Buffer.concat(segments);
    }
    // Monolog
    return synthesize(fullTranscript(item), VOICES.narrator, difficulty);
}

function requireRuntimeConfig(): string[] {
    const problems: string[] = [];
    if (!config.elevenLabsApiKey) {
        problems.push("ELEVENLABS_API_KEY o'rnatilmagan (.env). ElevenLabs kalitini qo'shing.");
    }
    if (!isObjectStorageEnabled()) {
        problems.push("DO Spaces sozlanmagan: AWS_S3_BUCKET (va AWS_ENDPOINT, kalitlar) kerak.");
    } else if (!config.aws.endpoint) {
        problems.push("AWS_ENDPOINT o'rnatilmagan — public URL yasab bo'lmaydi (masalan https://fra1.digitaloceanspaces.com).");
    }
    return problems;
}

async function main() {
    const flags = parseFlags(process.argv.slice(2));
    const datasets = flags.only ? DATASETS.filter((d) => d.difficulty === flags.only) : DATASETS;

    console.log("🎙  Listening audio generatsiyasi");
    console.log(`   Rejim: ${flags.dryRun ? "DRY-RUN (API chaqirilmaydi)" : "HAQIQIY (kredit sarflanadi)"}` +
        `${flags.force ? " | --force" : ""}${flags.only ? ` | --only=${flags.only}` : ""}`);
    console.log("");

    const problems = requireRuntimeConfig();

    // Mavjud xaritani yuklaymiz (bo'lmasa bo'sh).
    const map: AudioMap = loadAudioMapSafe();

    let willGenerate = 0;
    let willSkip = 0;
    let generated = 0;

    const storageReady = isObjectStorageEnabled();

    for (const { difficulty, items } of datasets) {
        console.log(`── ${difficulty.toUpperCase()} (${items.length} ta savol) ──`);
        for (let i = 0; i < items.length; i++) {
            const key = audioObjectKey(difficulty, i);
            const lineCount = items[i].lines?.length ?? 1;

            // Idempotentlik: mavjud bo'lsa o'tkazib yuboramiz (--force bo'lmasa).
            let exists = false;
            if (storageReady && !flags.force) {
                try {
                    exists = await objectExistsInSpaces(key);
                } catch (e) {
                    // Tekshira olmasak (masalan dry-run kredsiz), mavjud emas deb hisoblaymiz.
                    exists = false;
                }
            }

            if (exists && !flags.force) {
                willSkip++;
                // URL xaritada bo'lmasa qo'shib qo'yamiz.
                if (!map[key]) map[key] = publicUrlFor(key);
                console.log(`   ⏭  ${key} (mavjud, o'tkazildi)`);
                continue;
            }

            willGenerate++;
            const seg = lineCount > 1 ? `${lineCount} segment` : "1 segment";
            console.log(`   ${flags.dryRun ? "•" : "▶"}  ${key} (${seg})`);

            if (flags.dryRun) continue;

            // Haqiqiy generatsiya — bu yergacha yetish uchun config to'g'ri bo'lishi shart.
            if (problems.length > 0) {
                console.error("\n❌ Generatsiya qilib bo'lmaydi:");
                problems.forEach((p) => console.error("   - " + p));
                process.exit(1);
            }

            const audio = await buildAudio(items[i], difficulty);
            const tmpPath = `${audioMapPath()}.${difficulty}-${i}.tmp.mp3`;
            fs.writeFileSync(tmpPath, audio);
            const url = await uploadLocalFileToSpaces(tmpPath, key);
            fs.unlinkSync(tmpPath);
            if (!url) {
                console.error(`❌ Spaces'ga yuklab bo'lmadi: ${key}`);
                process.exit(1);
            }
            map[key] = url;
            generated++;

            // Har fayldan keyin xaritani saqlaymiz (uzilib qolsa progress yo'qolmasin).
            fs.writeFileSync(audioMapPath(), JSON.stringify(map, null, 2) + "\n", "utf8");
        }
        console.log("");
    }

    // Xaritani yakuniy holatda yozamiz (dry-run bo'lmasa).
    if (!flags.dryRun) {
        fs.writeFileSync(audioMapPath(), JSON.stringify(map, null, 2) + "\n", "utf8");
    }

    console.log("── Xulosa ──");
    console.log(`   Yaratiladi/yaratildi: ${flags.dryRun ? willGenerate : generated}`);
    console.log(`   O'tkazildi (mavjud):  ${willSkip}`);

    if (flags.dryRun) {
        if (problems.length > 0) {
            console.log("");
            console.log("ℹ️  DIQQAT: haqiqiy generatsiya uchun quyidagilar kerak:");
            problems.forEach((p) => console.log("   - " + p));
            console.log("   (Dry-run rejimida bular talab qilinmaydi.)");
        }
        console.log("");
        console.log(`✅ Dry-run tugadi. Haqiqiy generatsiya uchun --dry-run'siz ishga tushiring.`);
    } else {
        console.log("");
        console.log(`✅ Tayyor. Xarita yozildi: ${audioMapPath()}`);
        console.log("   Endi seed skriptlarni ishga tushiring (masalan):");
        console.log("     npx tsx prisma/seed-listening-easy.ts");
    }
}

main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
});
