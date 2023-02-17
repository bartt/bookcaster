import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { CategoryRequestGeneric } from '../interfaces/index.js';
import { Category, Book } from '../models/index.js';

const categories: FastifyPluginAsync = async (server: FastifyInstance): Promise<void> => {
  server.get('/categories', async (request, reply) => {
    const categories = await Category.query()
      .orderBy('name')
      .withGraphFetched('[books]');
    return reply.view('views/categories', {
      categories,
      title: 'Audiobooks by Category'
    });
  });

  server.get<CategoryRequestGeneric>('/category/:categoryName', async (request, reply) => {
    const category = await Category.query()
      .findOne('name', 'like', request.params.categoryName);
    if (!category) {
      return 'error';
    }
    const books = (await Category.relatedQuery('books')
      .for(category.id)
      .withGraphFetched('[files, authors, categories]') as Book[]);
    return reply.view('views/books', {
      books: books.map((book) => {
        return {
          ...book,
          url: book.toUrl(request.protocol, request.hostname),
          duration: book.duration()
        };
      }),
      by: 'books',
      corpus: JSON.stringify(books.map((book) => {
        return {
          id: book.id, 
          title: book.title, 
          description: book.description, 
          authors: book.authors, 
          categories: book.categories
        };
      })),
      title: `Audiobooks in the ${category.name} category`
    });
  });
};

export { categories };