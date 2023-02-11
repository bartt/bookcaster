import * as dotenv from 'dotenv';
dotenv.config()

import handlebars from 'handlebars'
import { inspect } from 'node:util';
import { Author, knex, config } from './models/index.js';
import { server } from './server/index.js'

handlebars.registerHelper('formatDuration', (durationSec: number) => {
  const MINUTE = 60
  const HOUR = 60 * MINUTE
  const duration = []
  const hours = durationSec / HOUR
  if (hours > 0) {
    duration.push(Math.floor(hours).toString().padStart(2, '0'))
    durationSec = durationSec % HOUR
  }
  const minutes = durationSec / 60
  if (minutes > 0) {
    duration.push(Math.floor(minutes).toString().padStart(2, '0'))
    durationSec = durationSec % 60
  }
  duration.push(Math.floor(durationSec).toString().padStart(2, '0'))
  return duration.join(':')
})

handlebars.registerHelper('round', (durationSec: number): number => Math.round(durationSec))

handlebars.registerHelper('join', (authors: Array<Author>, separator: string = ', '): string => authors.map((author) => author.name).join(separator))

handlebars.registerHelper('blankGuard', (value: string, guard: string) => !value || value.length == 0 ? guard : value)

handlebars.registerHelper('toUTCString', (date: number): string => new Date(date).toUTCString())

handlebars.registerHelper('toItpc', (url: string) => url.replace(/^https?/, 'itpc'))

server.listen({ port: 8080, host: '::' }, async (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }

  // Setup the database
  await knex.migrate.latest(config.migrations)

  console.log(`Server listening at ${address}`)
})
