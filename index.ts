import * as dotenv from 'dotenv';
dotenv.config()

import fastify from 'fastify';
import s3 from 's3';
import { Author, Book, Category, CoverImage, knex, config, MediaFile } from './models/index.js';

const server = fastify()

const s3Client = s3.createClient({
  s3Options: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    endpoint: process.env.S3_ENDPOINT
  }
})

server.get('/ping', async (request, reply) => {

  const lister = s3Client.listObjects({
    s3Params: {
      Bucket: "icloud",
      Prefix: "audiobooks"
    },
    recursive: false
  })


  lister.on('data', async (data) => {
    for (const obj of data.Contents) {
      const parts: string[] = obj.Key.split('/')
      if (obj.Size == 0) {
        // Skip /audiobooks top level directory.
        if (parts.length <= 2) {
          continue
        }
        // Skip the empty part as the result of the trailing / for directories.
        const name = parts[parts.length - 2]
        // Skip books that already exist.
        if (await Book.query().findOne({ name: name })) {
          console.log(`Skipping book ${name}.`)
          continue
        }
        const book = await Book.query().insert({
          name: name,
          title: Book.toTitle(name)
        })
        console.log(`Inserted book ${book.name}.`)
      } else {
        // Skip image/audio files in the /audiobooks top level directory.
        if (parts.length <= 2) {
          continue
        }
        const ext: string = obj.Key.split('.').pop().toLowerCase()
        const fileName = parts.pop() || ""
        const bookName = parts.pop() || ""
        switch (ext) {
          case "mp3":
          case "m4a":
            // Handle audio file
            const book = await Book.query()
              .findOne({
                name: bookName
              })
            if (book) {
              const files = book.files || []
              files.push(MediaFile.fromJson({
                name: fileName,
                size: 0,
                duration: 0
              }));
              const updatedRowCount = await book.$query().patch({
                files: files
              });
              console.log(`Updated ${updatedRowCount} book(s) with file ${fileName}`);
            }
            break;
          case "jpg":
          case "jpeg":
          case "png":
            const updatedRowCount = await Book.query()
              .findOne({
                name: bookName
              })
              .patch({
                image: {
                  name: fileName,
                  size: 0,
                  height: 0,
                  width: 0
                }
              });
              console.log(`Updated ${updatedRowCount} book(s) with image ${fileName}.`);
            break;
          default:
            // Ignore
            break;
        }
      }
    }
  })

  return await lister.on('end', () => 'pong-a-long\n');

  // const lee = Author.fromJson({
  //   name: "Lee Child",
  // });
  // const bart = Author.fromJson({
  //   name: "Bart Teeuwisse",
  // });
  // const fiction = Category.fromJson({
  //   name: "Fiction"
  // });

  // const coverImage = new CoverImage('61-hours.jpg', 10, 360, 240)
  // const mediaFile = new MediaFile('61-hours-002.pmp3', 998, 10)
  // const book = await Book.query()
  //   .insertGraph({
  //     name: "61-hours",
  //     image: coverImage,
  //     files: [
  //       {
  //         name: '61-hours-001.pmp3',
  //         size: 99,
  //         duration: 9.01
  //       },
  //       mediaFile
  //     ],
  //     authors: [lee, bart],
  //     categories: [
  //       fiction
  //     ]
  //   });
  // console.log(JSON.stringify(book, undefined, "  "))
  // console.log(JSON.stringify(book.authors, undefined, "  "))
  // console.log(JSON.stringify(book.categories, undefined, "  "))
  // console.log(JSON.stringify(book.files, undefined, "  "))
  // console.log(JSON.stringify(book.image, undefined, "  "))

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
