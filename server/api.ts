import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { decode } from 'html-entities';
import {
  ApiBookRequestGeneric,
  ApiAuthorsNewRequestGeneric,
  ApiBookUpdateAuthorRequestGeneric,
  ApiCategoriesNewRequestGeneric,
  ApiBookUpdateCategoryRequestGeneric,
} from '../interfaces/index.js';
import { Author, Book, Category } from '../models/index.js';
import { join } from 'node:path';
import { request } from 'node:http';

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

  server.post<ApiBookRequestGeneric>(
    '/book/:bookId',
    async (request, reply) => {
      const bookId = request.params.bookId;
      const data = request.body;
      const field = data.field;
      const value = decode(data.value)
        .trim()
        .replace(/\n/g, '')
        .replace(/<br>$/, '')
        .replace(/(?:\s)\s+/, '');
      const model = {};
      model[field] = value;
      const book = await Book.query().patchAndFetchById(bookId, model);
      return model;
    }
  );

  server.post<ApiBookUpdateAuthorRequestGeneric>(
    '/book/:bookId/author',
    async (request, reply) => {
      const bookId = request.params.bookId;
      const authorId = request.body.authorId;
      const book = await Book.query().findById(bookId);
      const author = await Author.query().findById(authorId);
      if (author) {
        await book?.$relatedQuery('authors').relate(author);
        return { bookId, authorId };
      }
      return reply.code(400);
    }
  );

  server.delete<ApiBookUpdateAuthorRequestGeneric>(
    '/book/:bookId/author',
    async (request, reply) => {
      const bookId = request.params.bookId;
      const authorId = request.body.authorId;
      const book = await Book.query().findById(bookId);
      await book
        ?.$relatedQuery('authors')
        .unrelate()
        .where('authorId', authorId);
      const books = await Book.query()
        .joinRelated('authors', { alias: 'a' })
        .where('a.id', authorId);
      if (books.length == 0) {
        await Author.query().deleteById(authorId);
        return { bookId };
      }
      return { bookId, authorId };
    }
  );

  server.post<ApiAuthorsNewRequestGeneric>(
    '/authors',
    async (request, reply) => {
      const name = request.body.name;
      const author = await Author.query().insertAndFetch({
        name: name,
      });
      return author;
    }
  );

  server.post<ApiBookUpdateCategoryRequestGeneric>(
    '/book/:bookId/category',
    async (request, reply) => {
      const bookId = request.params.bookId;
      const categoryId = request.body.categoryId;
      const book = await Book.query().findById(bookId);
      const category = await Category.query().findById(categoryId);
      if (category) {
        await book?.$relatedQuery('categories').relate(category);
        return { bookId, categoryId };
      }
      reply.code(400);
    }
  );

  server.delete<ApiBookUpdateCategoryRequestGeneric>(
    '/book/:bookId/category',
    async (request, reply) => {
      const bookId = request.params.bookId;
      const categoryId = request.body.categoryId;
      const book = await Book.query().findById(bookId);
      await book
        ?.$relatedQuery('categories')
        .unrelate()
        .where('categoryId', categoryId);
      const books = await Book.query()
        .joinRelated('categories', { alias: 'c' })
        .where('c.id', categoryId);
      if (books.length == 0) {
        await Category.query().deleteById(categoryId);
        return { bookId };
      }
      return { bookId, categoryId };
    }
  );

  server.post<ApiCategoriesNewRequestGeneric>(
    '/categories',
    async (request, reply) => {
      const name = request.body.name;
      const category = await Category.query().insertAndFetch({
        name: name,
      });
      return category;
    }
  );
};

export { api };
