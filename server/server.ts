import * as dotenv from 'dotenv';
dotenv.config()

import fastify, { FastifyInstance } from 'fastify';
import { fastifyView } from '@fastify/view'
import { fastifyStatic } from '@fastify/static'
import { fastifyBasicAuth } from '@fastify/basic-auth'
import handlebars from 'handlebars'
import { minify as minifier } from 'html-minifier'
import { cwd } from 'node:process';
import { join } from 'node:path'
import { statics } from './statics.js'
import { robots } from './robots.js';
import { admin } from './admin.js';
import { books } from './books.js';
import { authors } from './authors.js';
import { categories } from './categories.js';
import { Author } from '../models/index.js';

const server: FastifyInstance = fastify({
  logger: true
}).register(fastifyStatic, {
  root: join(cwd(), 'public')
}).register(fastifyView, {
  engine: {
    handlebars: handlebars
  },
  layout: "views/layouts/main.handlebars",
  viewExt: "handlebars",
  options: {
    partials: {
      header: "views/partials/header.handlebars",
      footer: "views/partials/footer.handlebars",
      authors: "views/partials/authors.handlebars",
      author: "views/partials/author.handlebars",
      category: "views/partials/category.handlebars",
      stack: "views/partials/stack.handlebars",
      book: "views/partials/book.handlebars",
      search: "views/partials/search.handlebars",
      summary: "views/partials/summary.handlebars",
    },
    useHtmlMinifier: minifier,
    htmlMinifierOptions: {
      removeComments: true,
      removeCommentsFromCDATA: true,
      collapseWhitespace: true,
      collapseBooleanAttributes: true,
      removeAttributeQuotes: true,
      removeEmptyAttributes: true
    }
  }
}).register(fastifyView, {
  engine: {
    handlebars: handlebars
  },
  layout: "views/layouts/plain.handlebars",
  viewExt: "handlebars",
  options: {
    partials: {
      authors: "views/partials/authors.handlebars",
    },
    useHtmlMinifier: minifier,
    htmlMinifierOptions: {
      removeComments: true,
      removeCommentsFromCDATA: true,
      collapseWhitespace: true,
      collapseBooleanAttributes: true,
      removeAttributeQuotes: true,
      removeEmptyAttributes: true
    }
  },
  propertyName: 'rss'
}).register(fastifyView, {
  engine: {
    handlebars: handlebars
  },
  layout: "views/layouts/plain.handlebars",
  viewExt: "handlebars",
  options: {
    partials: {
      authors: "views/partials/authors.handlebars",
    }
  },
  propertyName: 'm3u'
}).register(fastifyBasicAuth, {
  validate: async function (username, password, request, reply) {
    if (username !== process.env.AUDIO_BOOKS_USER || password !== process.env.AUDIO_BOOKS_PASSWORD) {
      return new Error('No books for you!')
    }
  },
  authenticate: {
    realm: "Protected Books"
  }
}).register(statics)
.register(robots)
.register(admin)
.register(books)
.register(authors)
.register(categories)

server.after(() => {
  server.addHook('onRequest', server.basicAuth)
})

// Declare the new `@fastify/view` functions  
declare module "fastify" {
  interface FastifyReply {
   m3u(page: string, data?: object): FastifyReply;
   rss(page: string, data?: object): FastifyReply;
  }
}

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

export { server }