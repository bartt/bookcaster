import { table } from 'console';
import { knex, Knex } from 'knex';

export async function up(knex: Knex): Promise<any> {
  return knex.schema
    .createTable('books', (table) => {
      table.increments('id');
      table.integer('image_id').references('id').inTable('images'); // .notNullable();
      table.string('name', 255).notNullable();
      table.string('title', 255);
      table.text('description');
    })
    .createTable('authors', (table) => {
      table.increments('id');
      table.string('name', 255).notNullable();
    })
    .createTable('books_authors', (table) => {
      table.increments('id');
      table.integer('book_id').references('id').inTable('books').notNullable();
      table.integer('author_id').references('id').inTable('authors').notNullable();
      table.unique(['book_id', 'author_id'])
    })
    .createTable('categories', (table) => {
      table.increments('id');
      table.string('name', 255).notNullable();
    })
    .createTable('books_categories', (table) => {
      table.increments('id');
      table.integer('book_id').references('id').inTable('books').notNullable();
      table.integer('category_id').references('id').inTable('categories').notNullable();
      table.unique(['book_id', 'category_id'])
    })
    .createTable('files', (table) => {
      table.increments('id');
      table.integer('book_id').references('id').inTable('books').notNullable();
      table.string('name', 255).notNullable();
      table.integer('size').notNullable();
      table.decimal('duration').notNullable();
    })
    .createTable('images', (table) => {
      table.increments('id');
      table.string('name', 255).notNullable();
      table.integer('size').notNullable();
      table.integer('height').notNullable();
      table.integer('width').notNullable();
    })
}

export async function down(knex: Knex): Promise<any> {
  return knex.schema
    .dropTable('books')
    .dropTable('authors')
    .dropTable('books_authors')
    .dropTable('categories')
    .dropTable('books_categories')
    .dropTable('files')
    .dropTable('images')
}