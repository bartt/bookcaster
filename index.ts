import * as dotenv from 'dotenv';
dotenv.config()

import fastify from 'fastify';
import { fastifyView } from '@fastify/view'
import { fastifyStatic } from '@fastify/static'
import { fastifyBasicAuth } from '@fastify/basic-auth'
import handlebars from 'handlebars'
import sizeOf from 'image-size';
import ImageDataURI from 'image-data-uri';
import { parseBuffer } from 'music-metadata';
import { S3Client, ListObjectsCommand, ListObjectsCommandOutput, GetObjectCommand, GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { minify as minifier } from 'html-minifier'
import { inspect } from 'node:util';
import { cwd } from 'node:process';
import { join } from 'node:path'
import { Author, Book, Category, CoverImage, knex, config, MediaFile } from './models/index.js';
import { AuthorRequestGeneric, BookFeedRequestGeneric, CategoryRequestGeneric, FileRequestGeneric, SyncRequestGeneric } from './interfaces/index.js';

const server = fastify({
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
})

server.after(() => {
  server.addHook('onRequest', server.basicAuth)
})

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

const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  endpoint: process.env.S3_ENDPOINT,
  region: 'us-west-1'
})

const s3BaseConfig = {
  Bucket: "icloud",
}

// Maximum size to get all embeded media tags from a MP3/M4A media file. 
const mediaTagMaxSize = 666 * 1024;

// Minimum description length to extract from media files.
const minimumDescriptionLenth = 120;

server.get('/screen.css', async (request, reply) => {
  return reply.sendFile('screen.css', {
    maxAge: '3600000' // In ms!
  })
})

server.get('/launcher.js', async (request, reply) => {
  return reply.sendFile('launcher.js', {
    maxAge: '3600000' // 1 hour in ms!
  })
})

for (const size of [20, 29, 40, 50, 58, 72, 76, 80, 100, 144, 152, 167]) {
  server.get(`/favicon-${size}.png`, async (request, reply) => {
    return reply.sendFile(request.routerPath, {
      maxAge: '86400000' // 1 day in ms!
    })
  })
}


server.get('/robots.txt', async (request, reply) => {
  return "User-agent: *\nDisallow: /\n"
})

server.get('/date', async (query, reply) => {
  let isTruncated = true
  let marker: string | undefined
  while (isTruncated) {
    const listResponse: ListObjectsCommandOutput = await s3Client.send(new ListObjectsCommand({
      ...s3BaseConfig,
      Prefix: "audiobooks",
      Marker: marker,
    }))
    for (const obj of listResponse.Contents || []) {
      marker = obj.Key
      if (obj.Size == 0) {
        continue
      }
      const parts: string[] = obj.Key?.split('/') || []
      // Skip /audiobooks top level directory.
      if (parts.length <= 2) {
        continue
      }
      const ext: string = obj.Key?.split('.')?.pop()?.toLowerCase() || ''
      const fileName = parts.pop() || ""
      const bookName = parts.pop() || ""
      const book = await Book.query()
        .findOne('name', 'like', bookName)
      if (!book) {
        continue
      }
      switch (ext) {
        case 'mp3':
        case 'm4a':
          reply.raw.write(`Setting date of ${fileName} to ${obj.LastModified}.\n`)
          await Book.relatedQuery('files')
          .for(book.id)
          .where('name', 'like', fileName)
          .first()
          .patch({
            date: obj.LastModified
          })
          break;
        default:
          // Ignore
          break;
      }
    }
  }
  return reply.raw.end()
})

server.get<SyncRequestGeneric>('/sync', async (request, reply) => {
  let isTruncated = true
  let marker: string | undefined
  const addOnly = request.query.addOnly
  while (isTruncated) {
    const listResponse: ListObjectsCommandOutput = await s3Client.send(new ListObjectsCommand({
      ...s3BaseConfig,
      Prefix: "audiobooks",
      Marker: marker,
    }))
    for (const obj of listResponse.Contents || []) {
      marker = obj.Key
      console.log(marker)
      const parts: string[] = obj.Key?.split('/') || []
      if (obj.Size == 0) {
        // Skip /audiobooks top level directory.
        if (parts.length <= 2) {
          continue
        }
        // Skip the empty part as the result of the trailing / for directories.
        const name = parts[parts.length - 2]
        // Skip books that already exist.
        if (await Book.query().findOne('name', 'like', name)) {
          reply.raw.write(`Skipped recreating known book ${name}.\n`)
          continue
        }
        const book = await Book.query()
          .insert({
            name: name,
            title: Book.toTitle(name)
          })
        reply.raw.write(`Inserted book ${book.name}.\n`)
      } else {
        // Skip image/audio files in the /audiobooks top level directory.
        if (parts.length <= 2) {
          continue
        }
        const ext: string = obj.Key?.split('.')?.pop()?.toLowerCase() || ''
        const fileName = parts.pop() || ""
        const bookName = parts.pop() || ""
        const book = await Book.query()
          .findOne('name', 'like', bookName)
        if (!book) {
          reply.raw.write(`Could not find book ${bookName}!\n`)
          continue
        }
        if (book.image && addOnly) {
          reply.raw.write(`In add only mode; skipping file ${fileName}.\n`)
          continue
        }
        switch (ext) {
          case 'mp3':
          case 'm4a':
            // Handle audio file
            // See if the audio file is already in the database.
            let file = await Book.relatedQuery('files')
              .for(book.id)
              .where('name', 'like', fileName)
              .whereNot({
                duration: 0
              })
              .first()
            if (file) {
              // Skip the audio file when the size hasn't changed. 
              if (file.size == obj.Size) {
                reply.raw.write(`Skipped known ${fileName} with duration ${(file as MediaFile).duration}.\n`);
                continue
              }
            }

            // File size has changed or this is a new file.
            const fileSize = obj.Size || 0
            const maxBytes =
              ext == 'm4a'
                ? Math.min(fileSize, Math.max(fileSize * .1, mediaTagMaxSize))
                : Math.min(fileSize, mediaTagMaxSize);
            const mimeType = ext == 'm4a' ? 'audio/x-m4a' : 'audio/mpeg'
            const fileResponse = await s3Client.send(new GetObjectCommand({
              ...s3BaseConfig,
              Key: obj.Key,
              Range: `bytes=0-${maxBytes}`
            }))
            const fileBuffer = Buffer.from(await fileResponse.Body?.transformToByteArray() || []);
            const metadata = await parseBuffer(fileBuffer, mimeType).then(async (metadata) => {
              // Must read the entire file to determine the duration when format reports `numberOfSamples`.
              if (metadata.format.numberOfSamples && obj.Size && obj.Size > maxBytes) {
                const remainderResponse = await s3Client.send(new GetObjectCommand({
                  ...s3BaseConfig,
                  Key: obj.Key,
                  Range: `bytes=${maxBytes}-${obj.Size}`
                }))
                const remainderBuffer = Buffer.from(await remainderResponse.Body?.transformToByteArray() || [])
                return await parseBuffer(Buffer.concat([fileBuffer, remainderBuffer]), mimeType)
              }
              return metadata
            }).catch((err) => {
              console.log(`Failed to extract metadata from ${fileName} : ${err}.`)
              reply.raw.write(`Failed to extract metadata from ${fileName} : ${err}.\n`)
            })

            // Check if it is a new file.
            file = await Book.relatedQuery('files')
              .for(book.id)
              .where('name', 'like', fileName).first()
            if (file) {
              await file.$query()
                .update({
                  name: fileName,
                  size: obj.Size as number,
                  duration: metadata?.format.duration || 0,
                  date: fileResponse.LastModified || new Date()
                })
              reply.raw.write(`Updated ${fileName}.\n`);
            } else {
              await Book.relatedQuery('files')
                .for(book.id)
                .insert({
                  name: fileName,
                  size: obj.Size as number,
                  duration: metadata?.format.duration || 0,
                  date: fileResponse.LastModified || new Date()
                })
              reply.raw.write(`Inserted ${fileName}.\n`);
            }

            // Authors
            const authors = metadata?.common.artists?.map((artist) => Author.fromJson({ name: artist })) || []
            for (const author of authors) {
              const record = await Book.relatedQuery('authors')
                .for(book.id)
                .where('name', 'like', author.name)
                .first()
              if (record) {
                console.log(`Skipping known author ${author.name} of ${bookName}`)
                continue
              }
              const dbAuthor = await Author.query()
                .findOne('name', 'like', author.name)
                .first()
              if (dbAuthor) {
                await Book.relatedQuery('authors')
                  .for(book.id)
                  .relate(dbAuthor)
                console.log(`Linked author ${dbAuthor.name} to ${bookName}.`)
                continue
              }
              await Book.relatedQuery('authors')
                .for(book.id)
                .insert(author)
              console.log(`Inserted author ${author.name} of ${bookName}.`)
            }

            // Categories
            const categories = metadata?.common.genre?.map((genre) => Category.fromJson({ name: genre })) || []
            for (const category of categories) {
              const record = await Book.relatedQuery('categories')
                .for(book.id)
                .where('name', 'like', category.name)
                .first()
              if (record) {
                console.log(`Skipping known category ${category.name} of ${bookName}`)
                continue
              }
              const dbCategory = await Category.query()
                .findOne('name', 'like', category.name)
                .first()
              if (dbCategory) {
                await Book.relatedQuery('categories')
                  .for(book.id)
                  .relate(dbCategory)
                console.log(`Linked category ${dbCategory.name} to ${bookName}.`)
                continue
              }
              await Book.relatedQuery('categories')
                .for(book.id)
                .insert(category)
              console.log(`Inserted category ${Category.name} to ${bookName}.`)
            }

            // Description 
            const description = metadata?.common.comment?.join(' ') || ''
            if (description.length > minimumDescriptionLenth) {
              await book.$query()
                .patch({
                  description: description
                })
            }

            // Update the book's title when the title in the file is longer
            const title = metadata?.common.album
            const bookTitleLength = book.title?.length || 0
            if (title && bookTitleLength < title.length) {
              await book.$query()
                .patch({
                  title: title
                })
            }
            break;
          case "jpg":
          case "jpeg":
          case "png":
            const imageResponse = await s3Client.send(new GetObjectCommand({
              ...s3BaseConfig,
              Key: obj.Key
            }))
            const imageBuffer = Buffer.from(await imageResponse.Body?.transformToByteArray() || [])
            const imageSize = sizeOf(imageBuffer)
            const imageDataUri = ImageDataURI.encode(imageBuffer, imageSize.type)
            const updatedRowCount = await book.$query()
              .patch({
                image: {
                  name: fileName,
                  size: obj.Size as number,
                  height: imageSize.height || 0,
                  width: imageSize.width || 0,
                  dataUri: imageDataUri
                }
              });
            reply.raw.write(`Updated ${updatedRowCount} book(s) with image ${fileName}.\n`);
            break;
          default:
            // Ignore
            break;
        }
      }
    }
    isTruncated = listResponse.IsTruncated || false
  }
  return reply.raw.end()
})

server.get<BookFeedRequestGeneric>('/:bookName([^.]+):ext', async (request, reply) => {
  let ext = request.params.ext.split('.').pop()
  const book = await Book.query()
    .findOne('name', 'like', request.params.bookName)
    .withGraphFetched('[files, authors, categories]')
  if (!book) {
    return `Could not find ${request.params.bookName}!`
  }
  switch (ext) {
    case '':
      return reply.view('views/books', {
        books: [{
          ...book,
          duration: book.duration(),
          url: book.toUrl(request.protocol, request.hostname),
        }],
        title: `${book.title} by ${(book.authors || []).map((author) => author.name).join(' & ') || 'Unknown Author'}`
      })
      break

    case 'm3u':
      return reply.type('audio/x-mpegurl').m3u('views/m3u', {
        book: {
          ...book,
          files: (book?.files || []).map((file) => {
            return {
              ...file,
              url: file.toUrl(request.protocol, request.hostname, book.name)
            }
          })
        }
      })
      break;

    case 'rss':
      const data = {
        ...book,
        files: (book?.files || []).map((file) => {
          return {
            ...file,
            url: file.toUrl(request.protocol, request.hostname, book.name),
            mimeType: 'audio/mpeg',
          }
        }),
        publication: book.publication(),
        url: book.toUrl(request.protocol, request.hostname)
      }
      console.log(data)
      return reply.type('application/xml').rss('views/atom', {
        book: data
      })
      break;

    case 'jpg':
    case 'jpeg':
    case 'png':
      const imageResponse = await s3Client.send(new GetObjectCommand({
        ...s3BaseConfig,
        Key: `audiobooks/${request.params.bookName}/${request.params.bookName}.${ext}`
      }))
      const buffer = Buffer.from(await imageResponse.Body?.transformToByteArray() || [])
      reply.type(`image/${ext}`)
      return reply.send(buffer)
      break;

    default:
      return `Unknown ${ext} for ${book.name}`
      break;
  }
})

server.get<FileRequestGeneric>('/:bookName/:fileName', async (request, reply) => {
  const rangeSize = 6 * 1024 * 1024
  let rangeStart = 0
  let contentSize = Number.MAX_VALUE
  let isTypeSet = false
  while (rangeStart < contentSize) {
    const rangeEnd = Math.min(rangeStart + rangeSize, contentSize)
    const fileResponse: GetObjectCommandOutput = await s3Client.send(new GetObjectCommand({
      ...s3BaseConfig,
      Key: `audiobooks/${request.params.bookName}/${request.params.fileName}`,
      Range: `bytes=${rangeStart}-${rangeEnd}`
    }))
    if (fileResponse.ContentRange) {
      contentSize = Number.parseInt(fileResponse.ContentRange.split('/').pop() || '') || contentSize
    }
    if (fileResponse.ContentType && !isTypeSet) {
      reply.raw.writeHead(200, {
        'Content-Type': fileResponse.ContentType,
        'Content-Length': contentSize
      })
      isTypeSet = true
    }
    const buffer = Buffer.from(await fileResponse.Body?.transformToByteArray() || [])
    reply.raw.write(buffer)
    rangeStart = rangeEnd
  }
})

server.get('/', async (request, reply) => {
  const books = await Book.query()
    .withGraphFetched('[files, authors, categories]');
  const booksSummed = books.map((book) => {
    return {
      ...book,
      duration: book.duration(),
      url: book.toUrl(request.protocol, request.hostname)
    }
  })
  return reply.view('views/books', {
    books: booksSummed,
    title: 'Audiobooks as Podcasts'
  })
})

server.get('/authors', async (request, reply) => {
  const authors = await Author.query()
    .orderBy('name')
    .withGraphFetched('[books]');
  return reply.view('views/authors', {
    authors,
    title: `Audiobooks by Author`
  })
})

server.get<AuthorRequestGeneric>('/author/:authorName', async (request, reply) => {
  const author = await Author.query()
    .findOne('name', 'like', request.params.authorName)
  if (!author) {
    return "error"
  }
  const books = await Author.relatedQuery('books')
    .for(author.id)
    .withGraphFetched('[files, authors, categories]')
  const booksSummed = books.map((book) => {
    return {
      ...book,
      duration: book.duration(),
      url: book.toUrl(request.protocol, request.hostname)
    }
  })
  return reply.view('views/books', {
    books: booksSummed,
    title: `Audiobooks by ${author.name}`
  })
})

server.get('/categories', async (request, reply) => {
  const categories = await Category.query()
    .orderBy('name')
    .withGraphFetched('[books]');
  return reply.view('views/categories', {
    categories,
    title: 'Audiobooks by Category'
  })
})

server.get<CategoryRequestGeneric>('/category/:categoryName', async (request, reply) => {
  const category = await Category.query()
    .findOne('name', 'like', request.params.categoryName)
  if (!category) {
    return "error"
  }
  const books = (await Category.relatedQuery('books')
    .for(category.id)
    .withGraphFetched('[files, authors, categories]') as Book[])
  const booksSummed = books.map((book) => {
    return {
      ...book,
      url: book.toUrl(request.protocol, request.hostname)
    }
  })
  return reply.view('views/books', {
    books: booksSummed,
    title: `Audiobooks in the ${category.name} category`
  })
})

server.listen({ port: 8080, host: '::' }, async (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }

  // Setup the database
  await knex.migrate.latest(config.migrations)

  console.log(`Server listening at ${address}`)
})
