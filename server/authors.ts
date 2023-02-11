import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { AuthorRequestGeneric } from '../interfaces/index.js';
import { Author } from '../models/index.js';

const authors: FastifyPluginAsync = async (server: FastifyInstance): Promise<void> => {
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
}

export { authors }