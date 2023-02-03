import * as dotenv from 'dotenv';
dotenv.config()

import fastify from 'fastify';
import sizeOf from 'image-size';
import ImageDataURI from 'image-data-uri';
import { S3Client, ListObjectsCommand, ListObjectsCommandOutput, GetObjectCommand } from "@aws-sdk/client-s3";
import { Author, Book, Category, CoverImage, knex, config, MediaFile } from './models/index.js';

const server = fastify()

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

server.get('/ping', async (request, reply) => {
  const actions: string[] = []
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
      const parts: string[] = obj.Key?.split('/') || []
      if (obj.Size == 0) {
        // Skip /audiobooks top level directory.
        if (parts.length <= 2) {
          continue
        }
        // Skip the empty part as the result of the trailing / for directories.
        const name = parts[parts.length - 2]
        // Skip books that already exist.
        if (await Book.query().findOne({ name: name })) {
          actions.push(`Skipping book ${name}.`)
          continue
        }
        const book = await Book.query().insert({
          name: name,
          title: Book.toTitle(name)
        })
        actions.push(`Inserted book ${book.name}.`)
      } else {
        // Skip image/audio files in the /audiobooks top level directory.
        if (parts.length <= 2) {
          continue
        }
        const ext: string = obj.Key?.split('.')?.pop()?.toLowerCase() || ''
        const fileName = parts.pop() || ""
        const bookName = parts.pop() || ""
        switch (ext) {
          case "mp3":
          case "m4a":
            // Handle audio file
            await Book.relatedQuery('files')
              .for(Book.query()
                .findOne({
                  name: bookName
                })
              ).insert({
                name: fileName,
                size: obj.Size as number,
                duration: 0
              }).onConflict(['name', 'bookId'])
              .merge();
            actions.push(`Inserted/updated ${fileName}.`);
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
            const updatedRowCount = await Book.query()
              .findOne({
                name: bookName
              })
              .patch({
                image: {
                  name: fileName,
                  size: obj.Size as number,
                  height: imageSize.height || 0,
                  width: imageSize.width || 0,
                  dataUri: imageDataUri
                }
              });
            actions.push(`Updated ${updatedRowCount} book(s) with image ${fileName}.`);
            break;
          default:
            // Ignore
            break;
        }
      }
    }
    isTruncated = listResponse.IsTruncated || false
  }

  return actions.join('\n');
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
