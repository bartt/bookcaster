import fastify from 'fastify';
import s3 from 's3';

import { Author, Book, Category, File, Image, knex, config } from './models/index.js';

(async () => {
  await knex.destroy()
  await knex.migrate.latest(config.migrations)
  const pic = await new Image({
    name: '61-hours.jpg',
    size: 10,
    height: 360,
    width: 240,
  }).save()
  const lee = await new Author({
    name: "Lee Child",
  }).save()
  const bart = await new Author({
    name: "Bart Teeuwisse",
  }).save()
  const book = await new Book({
    name: "61-hours",
    image_id: pic.id,
  }).save()
  book.authors().attach([lee, bart])
  const fiction = await new Category({
    name: "Fiction"
  }).save()
  book.categories().attach([fiction])
  await new File({
    name: '61-hours-001.pmp3',
    size: 99,
    duration: 9.01,
    book_id: book.id,
  }).save()
  await new File({
    name: '61-hours-002.pmp3',
    size: 998,
    duration: 10,
    book_id: book.id,
  }).save()
  await new File({
    name: '61-hours-003.pmp3',
    size: 998,
    duration: 15,
    book_id: book.id,
  }).save()  
  await book.refresh({
    withRelated: ['authors', 'categories', 'files', 'image']
  })
  console.log(JSON.stringify(book, undefined, "  "))
  console.log(JSON.stringify(book.related('authors'), undefined, "  "))
  console.log(JSON.stringify(book.related('categories'), undefined, "  "))
  console.log(JSON.stringify(book.related('files'), undefined, "  "))
  console.log(JSON.stringify(book.related('image'), undefined, "  "))
  console.log(book.related('authors').pluck('name'))
  console.log(book.related('categories').pluck('name'))
  console.log(book.related('files').map((file) => `${JSON.stringify(file.pick(['name', 'size', 'duration']))}`))
  console.log(book.related('image').pick('name', 'size', 'height', 'width'))
})()

// const server = fastify()

// const s3Client = s3.createClient({
//   s3Options: {
//     accessKeyId: "79DL49GLAYEZHOHO3NQ2",
//     secretAccessKey: "zrDcCBCqn3UasF1IXMKee6nXjd9fkz3MIGrOFYsP",
//     endpoint: "https://s3.wasabisys.com"
//   }
// })

// const lister = s3Client.listObjects({
//   s3Params: {
//       Bucket: "icloud",
//       Prefix: "audiobooks"
//   },
//   recursive: false
// })

// interface IQuerystring {
//   username: string;
//   password: string;
// }

// interface IHeaders {
//   'h-Custom': string;
// }

// server.get('/ping', async (request, reply) => {
//   return 'pong-a-long\n'
// })

// server.get<{
//   Querystring: IQuerystring,
//   Headers: IHeaders
// }>('/auth', {
//   preValidation: (request, reply, done) => {
//     const { username, password } = request.query
//     done(username !== 'admin' ? new Error('Must be admin') : undefined) // only validate `admin` account
//   }
// }, async (request, reply) => {
//   const customerHeader = request.headers['h-Custom']
//   // do something with request data
//   return `logged in!`
// })

// server.listen({ port: 8080 }, (err, address) => {
//   if (err) {
//     console.error(err)
//     process.exit(1)
//   }
//   console.log(`Server listening at ${address}`)
// })
