import fastify from 'fastify';
import s3 from 's3';

import { Author, Book, Category, CoverImage, knex, config, MediaFile } from './models/index.js';

const server = fastify()

const s3Client = s3.createClient({
  s3Options: {
    accessKeyId: "79DL49GLAYEZHOHO3NQ2",
    secretAccessKey: "zrDcCBCqn3UasF1IXMKee6nXjd9fkz3MIGrOFYsP",
    endpoint: "https://s3.wasabisys.com"
  }
})

const lister = s3Client.listObjects({
  s3Params: {
      Bucket: "icloud",
      Prefix: "audiobooks"
  },
  recursive: false
})

server.get('/ping', async (request, reply) => {
  console.log(`Ping request received.`)
  const lee = Author.fromJson({
    name: "Lee Child",
  });
  const bart = Author.fromJson({
    name: "Bart Teeuwisse",
  });
  const fiction = Category.fromJson({
    name: "Fiction"
  });

  const coverImage = new CoverImage('61-hours.jpg', 10, 360, 240)
  const mediaFile = new MediaFile('61-hours-002.pmp3', 998, 10)
  const book = await Book.query()
    .insertGraph({
      name: "61-hours",
      image: coverImage,
      files: [
        {
          name: '61-hours-001.pmp3',
          size: 99,
          duration: 9.01
        },
        mediaFile
      ],
      authors: [lee, bart],
      categories: [
        fiction
      ]
    });
  console.log(JSON.stringify(book, undefined, "  "))
  console.log(JSON.stringify(book.authors, undefined, "  "))
  console.log(JSON.stringify(book.categories, undefined, "  "))
  console.log(JSON.stringify(book.files, undefined, "  "))
  console.log(JSON.stringify(book.image, undefined, "  "))

  return 'pong-a-long\n'
})

server.listen({ port: 8080 }, async (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }

  // Setup the database
  await knex.migrate.rollback({}, true)
  await knex.migrate.latest(config.migrations)

  console.log(`Server listening at ${address}`)
})
