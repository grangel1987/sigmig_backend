import { Ignitor } from '@adonisjs/core'

const APP_ROOT = new URL('./', import.meta.url)
const IMPORTER = (filePath) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

new Ignitor(APP_ROOT, { importer: IMPORTER })
  .tap((app) => {
    app.booting(async () => {
      await import('#start/env')
    })
    app.listen('SIGTERM', () => app.terminate())
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())
  })
  .console()
  .then(async (app) => {
    const hash = await app.container.make('hash')
    const pass = await hash.make('12345678')
    console.log('\n\n--- ADONIS SCRYPT HASH ---')
    console.log(pass)
    console.log('--------------------------\n\n')
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
