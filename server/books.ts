import { GetObjectCommand, GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  BookFeedRequestGeneric,
  FileRequestGeneric,
} from '../interfaces/index.js';
import { Book } from '../models/index.js';
import { s3Client, s3BaseConfig } from './s3-client.js';

const books: FastifyPluginAsync = async (
  server: FastifyInstance
): Promise<void> => {
  server.get<BookFeedRequestGeneric>(
    '/:bookName([^.]+):ext',
    async (request, reply) => {
      const ext = request.params.ext.split('.').pop();
      const book = await Book.query()
        .findOne('name', 'like', request.params.bookName)
        .withGraphFetched('[files, authors, categories]');
      if (!book) {
        return `Could not find ${request.params.bookName}!`;
      }
      switch (ext) {
        case '':
          return reply.view('views/book', {
            book: {
              ...book,
              duration: book.duration(),
              url: book.toUrl(request.protocol, request.hostname),
            },
            title: `${book.title}`,
            editable: false,
          });

        case 'm3u':
          return reply.type('audio/x-mpegurl').m3u('views/m3u', {
            book: {
              ...book,
              files: (book?.files || []).map((file) => {
                return {
                  ...file,
                  url: file.toUrl(
                    request.protocol,
                    request.hostname,
                    book.name
                  ),
                };
              }),
            },
          });

        case 'rss':
          return reply.type('application/xml').rss('views/atom', {
            book: {
              ...book,
              files: (book?.files || []).map((file) => {
                return {
                  ...file,
                  url: file.toUrl(
                    request.protocol,
                    request.hostname,
                    book.name
                  ),
                  mimeType: 'audio/mpeg',
                };
              }),
              publication: book.publication(),
              url: book.toUrl(request.protocol, request.hostname),
            },
          });

        case 'jpg':
        case 'jpeg':
        case 'png':
          const imageResponse = await s3Client.send(
            new GetObjectCommand({
              ...s3BaseConfig,
              Key: `audiobooks/${request.params.bookName}/${request.params.bookName}.${ext}`,
            })
          );
          const buffer = Buffer.from(
            (await imageResponse.Body?.transformToByteArray()) || []
          );
          reply.type(`image/${ext}`);
          return reply.send(buffer);

        default:
          return `Unknown ${ext} for ${book.name}`;
      }
    }
  );

  server.get<FileRequestGeneric>(
    '/:bookName/:fileName',
    async (request, reply) => {
      const rangeSize = 6 * 1024 * 1024;
      let rangeStart = 0;
      let contentSize = Number.MAX_VALUE;
      let isTypeSet = false;
      while (rangeStart < contentSize) {
        const rangeEnd = Math.min(rangeStart + rangeSize, contentSize);
        const fileResponse: GetObjectCommandOutput = await s3Client.send(
          new GetObjectCommand({
            ...s3BaseConfig,
            Key: `audiobooks/${request.params.bookName}/${request.params.fileName}`,
            Range: `bytes=${rangeStart}-${rangeEnd}`,
          })
        );
        if (fileResponse.ContentRange) {
          contentSize =
            Number.parseInt(fileResponse.ContentRange.split('/').pop() || '') ||
            contentSize;
        }
        if (fileResponse.ContentType && !isTypeSet) {
          reply.raw.writeHead(200, {
            'Content-Type': fileResponse.ContentType,
            'Content-Length': contentSize,
          });
          isTypeSet = true;
        }
        const buffer = Buffer.from(
          (await fileResponse.Body?.transformToByteArray()) || []
        );
        reply.raw.write(buffer);
        rangeStart = rangeEnd;
      }
    }
  );

  server.get('/', async (request, reply) => {
    const books = await Book.query().withGraphFetched(
      '[files, authors, categories]'
    );
    return reply.view('views/books', {
      books: books.map((book) => {
        return {
          ...book,
          duration: book.duration(),
          url: book.toUrl(request.protocol, request.hostname),
        };
      }),
      by: 'books',
      corpus: JSON.stringify(
        books.map((book) => {
          return {
            id: book.id,
            title: book.title,
            description: book.description,
            authors: book.authors,
            categories: book.categories,
          };
        })
      ),
      title: 'Audiobooks as Podcasts',
    });
  });
};

export { books };
