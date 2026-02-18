const env = process.env;

export const config = {
  port: parseInt(env.PORT ?? "3000", 10),
  nodeEnv: env.NODE_ENV ?? "development",
  databaseUrl: env.DATABASE_URL ?? "",
  jwtSecret: env.JWT_SECRET ?? "",
  jwtRefreshSecret: env.JWT_REFRESH_SECRET ?? "",
  jwtAccessExpiresIn: env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  jwtRefreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  frontendUrl: env.FRONTEND_URL ?? "http://localhost:5173",
  backendUrl: env.BACKEND_URL ?? "http://localhost:3000",
  openaiApiKey: env.OPENAI_API_KEY ?? "",
  geminiApiKey: env.GEMINI_API_KEY ?? "",
  googleClientId: env.GOOGLE_CLIENT_ID ?? "",
  aws: {
    accessKeyId: env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY ?? "",
    region: env.AWS_REGION ?? "us-east-1",
    s3Bucket: env.AWS_S3_BUCKET ?? "",
  },
  click: {
    merchantId: env.CLICK_MERCHANT_ID ?? "",
    serviceId: env.CLICK_SERVICE_ID ?? "",
    secretKey: env.CLICK_SECRET_KEY ?? "",
    merchantUserId: env.CLICK_MERCHANT_USER_ID ?? "",
  },
  // Email (SMTP) – parol tiklash va obuna eslatma uchun
  smtp: {
    host: env.SMTP_HOST ?? "",
    port: parseInt(env.SMTP_PORT ?? "587", 10),
    secure: env.SMTP_SECURE === "true",
    user: env.SMTP_USER ?? "",
    pass: env.SMTP_PASS ?? "",
    from: env.SMTP_FROM ?? env.SMTP_USER ?? "noreply@Arab Exam.uz",
  },
} as const;
