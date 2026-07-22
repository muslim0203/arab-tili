import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import multer from "multer"
import multerS3 from "multer-s3"
import crypto from "crypto"
import path from "path"
import fs from "fs"
import fsp from "fs/promises"
import { config } from "../config.js"
import { safeAudioExt } from "./sanitize.js"

const s3ClientConfig: any = {
    region: config.aws.region,
}

if (config.aws.accessKeyId && config.aws.secretAccessKey) {
    s3ClientConfig.credentials = {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
    }
}

if (config.aws.endpoint) {
    s3ClientConfig.endpoint = config.aws.endpoint
    s3ClientConfig.forcePathStyle = false
}

export const s3Client = new S3Client(s3ClientConfig)

export const createAudioUpload = (folder: string) => {
    // If S3 Bucket is provided, use S3. Otherwise fallback to local uploads directory.
    if (config.aws.s3Bucket) {
        return multer({
            storage: multerS3({
                s3: s3Client,
                bucket: config.aws.s3Bucket,
                acl: "public-read",
                contentType: multerS3.AUTO_CONTENT_TYPE,
                key: function (_req: any, file: any, cb: any) {
                    const ext = safeAudioExt(file.originalname, "")
                    const name = `${folder}/${crypto.randomBytes(12).toString("hex")}${ext}`
                    cb(null, name)
                },
            }),
            limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
            fileFilter: checkAudioMime,
        })
    }

    // Fallback: Local Storage
    const localTarget = path.join(process.cwd(), "uploads", folder)
    if (!fs.existsSync(localTarget)) fs.mkdirSync(localTarget, { recursive: true })

    return multer({
        storage: multer.diskStorage({
            destination: (_req, _file, cb) => cb(null, localTarget),
            filename: (_req, file, cb) => {
                const ext = safeAudioExt(file.originalname, "")
                const name = `${crypto.randomBytes(8).toString("hex")}${ext}`
                cb(null, name)
            },
        }),
        limits: { fileSize: 50 * 1024 * 1024 },
        fileFilter: checkAudioMime,
    })
}

function checkAudioMime(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
    const allowed = /\.(mp3|m4a|wav|ogg|webm|mpga|mpeg)$/i.test(file.originalname) || file.mimetype?.startsWith("audio/")
    cb(null, !!allowed)
}

export const getUploadedFileUrl = (file: Express.Multer.File, folder: string): string => {
    // If uploaded via S3, it has a `.location` property which holds the full public URL
    if ((file as any).location) {
        return (file as any).location
    }
    // Fallback to local API endpoint format
    return `/api/uploads/${folder}/${file.filename}`
}

/** Obyekt saqlash sozlanganmi (DO Spaces / S3). */
export const isObjectStorageEnabled = (): boolean => Boolean(config.aws.s3Bucket)

/**
 * Lokal faylni DO Spaces'ga ko'chiradi va public URL qaytaradi.
 *
 * Nega multer-s3 emas: gapirish/imtihon audiolari avval diskka tushishi kerak,
 * chunki Whisper transkripsiyasi fayl oqimini talab qiladi. Shuning uchun
 * ketma-ketlik: diskka yoz -> transkript qil -> Spaces'ga ko'chir -> lokalni o'chir.
 *
 * Saqlash sozlanmagan yoki xato bo'lsa `null` qaytaradi — chaqiruvchi lokal
 * URL bilan davom etadi (degradatsiya, sinish emas).
 */
export async function uploadLocalFileToSpaces(localPath: string, key: string): Promise<string | null> {
    if (!isObjectStorageEnabled()) return null
    try {
        const body = await fsp.readFile(localPath)
        await s3Client.send(new PutObjectCommand({
            Bucket: config.aws.s3Bucket,
            Key: key,
            Body: body,
            ACL: "public-read",
            ContentType: audioContentType(key),
        }))
        return publicUrlFor(key)
    } catch (e) {
        console.error("[Spaces] Yuklashda xato:", (e as Error).message)
        return null
    }
}

/** Spaces'dagi obyektni o'chirish (best-effort). */
export async function deleteFromSpaces(key: string): Promise<void> {
    if (!isObjectStorageEnabled()) return
    try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: config.aws.s3Bucket, Key: key }))
    } catch (e) {
        console.warn("[Spaces] O'chirishda xato:", (e as Error).message)
    }
}

/** Kalitdan public URL. DO Spaces virtual-hosted uslubda: https://<bucket>.<region>.digitaloceanspaces.com/<key> */
function publicUrlFor(key: string): string {
    const endpoint = config.aws.endpoint.replace(/\/+$/, "")
    if (!endpoint) return key
    const u = new URL(endpoint)
    return `${u.protocol}//${config.aws.s3Bucket}.${u.host}/${key}`
}

function audioContentType(key: string): string {
    const ext = path.extname(key).toLowerCase()
    const map: Record<string, string> = {
        ".mp3": "audio/mpeg",
        ".m4a": "audio/mp4",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
        ".webm": "audio/webm",
    }
    return map[ext] ?? "application/octet-stream"
}
