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
      book: "views/partials/book.handlebars",
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

export { server }