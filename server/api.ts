import { GetObjectCommand, GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { BookFeedRequestGeneric, FileRequestGeneric } from '../interfaces/index.js';
import { Book } from '../models/index.js';
import { join } from 'node:path'

const api: FastifyPluginAsync = async (server: FastifyInstance): Promise<void> => {

  server.get('/books', async (request, reply) => {
    const books = await Book.query()
    .withGraphFetched('[files, authors, categories]');
  return books.map((book) => {
      return {
        ...book,
        duration: book.duration(),
        url: book.toUrl(request.protocol, request.hostname)
      }
    })
  })
}

export { api }