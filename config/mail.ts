import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'

// Minimal mail configuration for SMTP driver.
// This file is used by @adonisjs/mail when installed.
export default defineConfig({
    default: 'smtp',

    mailers: {
        smtp: transports.smtp({
            host: env.get('SMTP_HOST', ''),
            port: env.get('SMTP_PORT', ''),
            secure: false, // Disable SSL for smtp4dev

            auth: env.get('SMTP_USERNAME') && env.get('SMTP_PASSWORD') ? {
                type: 'login',
                user: env.get('SMTP_USERNAME', ''),
                pass: env.get('SMTP_PASSWORD', '')
            } : undefined, // Only use auth if credentials are provided

            tls: {
                rejectUnauthorized: false // Allow self-signed certificates if needed
            },

            ignoreTLS: true, // Ignore TLS for smtp4dev
            requireTLS: false,

            pool: false,
            maxConnections: 5,
            maxMessages: 100,
        })
    }
})
