import Env from '#start/env'

// Minimal mail configuration for SMTP driver.
// This file is used by @adonisjs/mail when installed.
export default {
    driver: 'smtp',
    smtp: {
        host: Env.get('SMTP_HOST'),
        port: Env.get('SMTP_PORT'),
        secure: String(Env.get('SMTP_SECURE') ?? 'false') === 'true',
        auth: {
            type: 'login',
            user: (Env.get('SMTP_USERNAME') as string | undefined) ?? (Env.get('MAIL_USERNAME') as string | undefined) ?? '',
            pass: (Env.get('SMTP_PASSWORD') as string | undefined) ?? (Env.get('MAIL_PASSWORD') as string | undefined) ?? '',
        },
        from: (Env.get('MAIL_FROM') as string | undefined) ?? undefined,
    },
} as any
