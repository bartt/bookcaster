/* eslint-disable no-console */
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  ListObjectsCommand,
  ListObjectsCommandOutput,
  GetObjectCommand,
  GetObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { parseBuffer } from 'music-metadata';
import sizeOf from 'image-size';
import ImageDataURI from 'image-data-uri';
import { s3Client, s3BaseConfig } from './s3-client.js';
import { Author, Book, Category, MediaFile } from '../models/index.js';
import { SyncRequestGeneric } from '../interfaces/index.js';

// Maximum size to get all embeded media tags from a MP3/M4A media file.
const mediaTagMaxSize = 666 * 1024;

// Minimum description length to extract from media files.
const minimumDescriptionLenth = 120;

const admin: FastifyPluginAsync = async (
  server: FastifyInstance
): Promise<void> => {
  server.get('/date', async (query, reply) => {
    const isTruncated = true;
    let marker: string | undefined;
    while (isTruncated) {
      const listResponse: ListObjectsCommandOutput = await s3Client.send(
        new ListObjectsCommand({
          ...s3BaseConfig,
          Prefix: 'audiobooks',
          Marker: marker,
        })
      );
      for (const obj of listResponse.Contents || []) {
        marker = obj.Key;
        if (obj.Size == 0) {
          continue;
        }
        const parts: string[] = obj.Key?.split('/') || [];
        // Skip /audiobooks top level directory.
        if (parts.length <= 2) {
          continue;
        }
        const ext: string = obj.Key?.split('.')?.pop()?.toLowerCase() || '';
        const fileName = parts.pop() || '';
        const bookName = parts.pop() || '';
        const book = await Book.query().findOne('name', 'like', bookName);
        if (!book) {
          continue;
        }
        switch (ext) {
          case 'mp3':
          case 'm4a':
            reply.raw.write(
              `Setting date of ${fileName} to ${obj.LastModified}.\n`
            );
            await Book.relatedQuery('files')
              .for(book.id)
              .where('name', 'like', fileName)
              .first()
              .patch({
                date: obj.LastModified,
              });
            break;
          default:
            // Ignore
            break;
        }
      }
    }
    return reply.raw.end();
  });

  server.get<SyncRequestGeneric>('/sync', async (request, reply) => {
    let isTruncated = true;
    let marker: string | undefined;
    const addOnly = request.query.addOnly;
    while (isTruncated) {
      const listResponse: ListObjectsCommandOutput = await s3Client.send(
        new ListObjectsCommand({
          ...s3BaseConfig,
          Prefix: 'audiobooks',
          Marker: marker,
        })
      );
      for (const obj of listResponse.Contents || []) {
        marker = obj.Key;
        console.log(marker);
        const parts: string[] = obj.Key?.split('/') || [];
        if (obj.Size == 0) {
          // Skip /audiobooks top level directory.
          if (parts.length <= 2) {
            continue;
          }
          // Skip the empty part as the result of the trailing / for directories.
          const name = parts[parts.length - 2];
          // Skip books that already exist.
          if (await Book.query().findOne('name', 'like', name)) {
            reply.raw.write(`Skipped recreating known book ${name}.\n`);
            continue;
          }
          const book = await Book.query().insert({
            name: name,
            title: Book.toTitle(name),
          });
          reply.raw.write(`Inserted book ${book.name}.\n`);
        } else {
          // Skip image/audio files in the /audiobooks top level directory.
          if (parts.length <= 2) {
            continue;
          }
          const ext: string = obj.Key?.split('.')?.pop()?.toLowerCase() || '';
          const fileName = parts.pop() || '';
          const bookName = parts.pop() || '';
          const book = await Book.query().findOne('name', 'like', bookName);
          if (!book) {
            reply.raw.write(`Could not find book ${bookName}!\n`);
            continue;
          }
          if (book.image && addOnly) {
            reply.raw.write(`In add only mode; skipping file ${fileName}.\n`);
            continue;
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
                  duration: 0,
                })
                .first();
              if (file) {
                // Skip the audio file when the size hasn't changed.
                if (file.size == obj.Size) {
                  reply.raw.write(
                    `Skipped known ${fileName} with duration ${
                      (file as MediaFile).duration
                    }.\n`
                  );
                  continue;
                }
              }

              // File size has changed or this is a new file.
              const fileSize = obj.Size || 0;
              const maxBytes =
                ext == 'm4a'
                  ? Math.min(
                      fileSize,
                      Math.max(fileSize * 0.1, mediaTagMaxSize)
                    )
                  : Math.min(fileSize, mediaTagMaxSize);
              const mimeType = ext == 'm4a' ? 'audio/x-m4a' : 'audio/mpeg';
              const fileResponse = await s3Client.send(
                new GetObjectCommand({
                  ...s3BaseConfig,
                  Key: obj.Key,
                  Range: `bytes=0-${maxBytes}`,
                })
              );
              const fileBuffer = Buffer.from(
                (await fileResponse.Body?.transformToByteArray()) || []
              );
              const metadata = await parseBuffer(fileBuffer, mimeType)
                .then(async (metadata) => {
                  // Must read the entire file to determine the duration when format reports `numberOfSamples`.
                  if (
                    metadata.format.numberOfSamples &&
                    obj.Size &&
                    obj.Size > maxBytes
                  ) {
                    const remainderResponse = await s3Client.send(
                      new GetObjectCommand({
                        ...s3BaseConfig,
                        Key: obj.Key,
                        Range: `bytes=${maxBytes}-${obj.Size}`,
                      })
                    );
                    const remainderBuffer = Buffer.from(
                      (await remainderResponse.Body?.transformToByteArray()) ||
                        []
                    );
                    return await parseBuffer(
                      Buffer.concat([fileBuffer, remainderBuffer]),
                      mimeType
                    );
                  }
                  return metadata;
                })
                .catch((err) => {
                  console.log(
                    `Failed to extract metadata from ${fileName} : ${err}.`
                  );
                  reply.raw.write(
                    `Failed to extract metadata from ${fileName} : ${err}.\n`
                  );
                });

              // Check if it is a new file.
              file = await Book.relatedQuery('files')
                .for(book.id)
                .where('name', 'like', fileName)
                .first();
              if (file) {
                await file.$query().update({
                  name: fileName,
                  size: obj.Size as number,
                  duration: metadata?.format.duration || 0,
                  date: fileResponse.LastModified || new Date(),
                });
                reply.raw.write(`Updated ${fileName}.\n`);
              } else {
                await Book.relatedQuery('files')
                  .for(book.id)
                  .insert({
                    name: fileName,
                    size: obj.Size as number,
                    duration: metadata?.format.duration || 0,
                    date: fileResponse.LastModified || new Date(),
                  });
                reply.raw.write(`Inserted ${fileName}.\n`);
              }

              // Authors
              const authors =
                metadata?.common.artists?.map((artist) =>
                  Author.fromJson({ name: artist })
                ) || [];
              for (const author of authors) {
                const record = await Book.relatedQuery('authors')
                  .for(book.id)
                  .where('name', 'like', author.name)
                  .first();
                if (record) {
                  console.log(
                    `Skipping known author ${author.name} of ${bookName}`
                  );
                  continue;
                }
                const dbAuthor = await Author.query()
                  .findOne('name', 'like', author.name)
                  .first();
                if (dbAuthor) {
                  await Book.relatedQuery('authors')
                    .for(book.id)
                    .relate(dbAuthor);
                  console.log(`Linked author ${dbAuthor.name} to ${bookName}.`);
                  continue;
                }
                await Book.relatedQuery('authors').for(book.id).insert(author);
                console.log(`Inserted author ${author.name} of ${bookName}.`);
              }

              // Categories
              const categories =
                metadata?.common.genre?.map((genre) =>
                  Category.fromJson({ name: genre })
                ) || [];
              for (const category of categories) {
                const record = await Book.relatedQuery('categories')
                  .for(book.id)
                  .where('name', 'like', category.name)
                  .first();
                if (record) {
                  console.log(
                    `Skipping known category ${category.name} of ${bookName}`
                  );
                  continue;
                }
                const dbCategory = await Category.query()
                  .findOne('name', 'like', category.name)
                  .first();
                if (dbCategory) {
                  await Book.relatedQuery('categories')
                    .for(book.id)
                    .relate(dbCategory);
                  console.log(
                    `Linked category ${dbCategory.name} to ${bookName}.`
                  );
                  continue;
                }
                await Book.relatedQuery('categories')
                  .for(book.id)
                  .insert(category);
                console.log(
                  `Inserted category ${Category.name} to ${bookName}.`
                );
              }

              // Description
              const description = metadata?.common.comment?.join(' ') || '';
              if (description.length > minimumDescriptionLenth) {
                await book.$query().patch({
                  description: description,
                });
              }

              // Update the book's title when the title in the file is longer
              const title = metadata?.common.album;
              const bookTitleLength = book.title?.length || 0;
              if (title && bookTitleLength < title.length) {
                await book.$query().patch({
                  title: title,
                });
              }
              break;
            case 'jpg':
            case 'jpeg':
            case 'png':
              const imageResponse = await s3Client.send(
                new GetObjectCommand({
                  ...s3BaseConfig,
                  Key: obj.Key,
                })
              );
              const imageBuffer = Buffer.from(
                (await imageResponse.Body?.transformToByteArray()) || []
              );
              const imageSize = sizeOf(imageBuffer);
              if (
                book.image &&
                (book.image.height == imageSize.height ||
                  book.image.width == imageSize.width)
              ) {
                reply.raw.write(`Skipping unchanged ${fileName}.\n`);
                continue;
              }
              const imageDataUri = ImageDataURI.encode(
                imageBuffer,
                imageSize.type
              );
              const updatedRowCount = await book.$query().patch({
                image: {
                  name: fileName,
                  size: obj.Size as number,
                  height: imageSize.height || 0,
                  width: imageSize.width || 0,
                  dataUri: imageDataUri,
                },
              });
              reply.raw.write(
                `Updated ${updatedRowCount} book(s) with image ${fileName}.\n`
              );
              break;
            default:
              // Ignore
              break;
          }
        }
      }
      isTruncated = listResponse.IsTruncated || false;
    }
    return reply.raw.end();
  });
};

export { admin };
