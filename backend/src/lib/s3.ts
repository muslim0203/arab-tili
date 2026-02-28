import { S3Client } from "@aws-sdk/client-s3"
import multer from "multer"
import multerS3 from "multer-s3"
import crypto from "crypto"
import path from "path"
import fs from "fs"
import { config } from "../config.js"

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
    let ep = config.aws.endpoint
    // Agar foydalanuvchi bilmasdan bucket nomini ham ulab qo'ygan bo'lsa (DO Spaces: https://bucket.fra1.digitaloceanspaces.com)
    // Uni tozalab olamiz.
    if (ep.includes(".digitaloceanspaces.com")) {
        const urlMatches = ep.match(/https?:\/\/([^.]+)\.([^.]+)\.digitaloceanspaces\.com/)
        if (urlMatches && urlMatches.length === 3 && config.aws.s3Bucket && urlMatches[1] === config.aws.s3Bucket) {
            ep = ep.replace(`${config.aws.s3Bucket}.`, "")
        }
    }
    s3ClientConfig.endpoint = ep
    // Required for DO Spaces or S3-compatible endpoints
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
                    const ext = path.extname(file.originalname) || ""
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
                const ext = path.extname(file.originalname) || ""
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
