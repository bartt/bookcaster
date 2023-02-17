import { GetObjectCommand, GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  BookFeedRequestGeneric,
  FileRequestGeneric,
} from '../interfaces/index.js';
import { Book } from '../models/index.js';
import { join } from 'node:path';

const api: FastifyPluginAsync = async (
  server: FastifyInstance
): Promise<void> => {
  server.get('/books', async (request, reply) => {
    const books = await Book.query().withGraphFetched('[authors, categories]');

    // Using `raw.write` to unsure the chunks received by the browser can be converted to text.
    const lastIndex = books.length - 1;
    reply.raw.write('[');
    books.forEach((book, index) => {
      reply.raw.write(
        JSON.stringify({
          ...book,
          duration: book.duration(),
          url: book.toUrl(request.protocol, request.hostname),
        })
      );
      if (index < lastIndex) {
        reply.raw.write(',');
      }
    });
    reply.raw.write(']');
    reply.raw.end();
  });
};

export { api };
