import { knex, Knex } from 'knex';

export async function up(knex: Knex): Promise<Knex.SchemaBuilder> {
  return knex.schema
    .createTable('books', (table) => {
      table.increments('id').primary();
      table.string('name', 255).notNullable().index();
      table.string('title', 255);
      table.text('description');
      table.json('image');
      table.unique(['name']);
    })
    .createTable('authors', (table) => {
      table.increments('id').primary();
      table.string('name', 255).notNullable().index();
      table.unique(['name']);
    })
    .createTable('books_authors', (table) => {
      table.increments('id').primary();
      table.integer('bookId').unsigned().index();
      table
        .foreign('bookId')
        .references('books.id')
        .withKeyName('fk_books')
        .onDelete('CASCADE');
      table.integer('authorId').unsigned().index();
      table
        .foreign('authorId')
        .references('authors.id')
        .withKeyName('fk_authors')
        .onDelete('CASCADE');
      table.unique(['bookId', 'authorId']);
    })
    .createTable('categories', (table) => {
      table.increments('id').primary();
      table.string('name', 255).notNullable().index();
      table.unique(['name']);
    })
    .createTable('books_categories', (table) => {
      table.increments('id').primary();
      table.integer('bookId').unsigned().index();
      table
        .foreign('bookId')
        .references('books.id')
        .withKeyName('fk_books')
        .onDelete('CASCADE');
      table.integer('categoryId').unsigned().index();
      table
        .foreign('categoryId')
        .references('categories.id')
        .withKeyName('fk_categories')
        .onDelete('CASCADE');
      table.unique(['bookId', 'categoryId']);
    })
    .createTable('files', (table) => {
      table.increments('id').primary();
      table.integer('bookId').unsigned().index();
      table.foreign('bookId').references('books.id').withKeyName('fk_books');
      table.string('name', 500).notNullable().index();
      table.integer('size').notNullable();
      table.float('duration').notNullable();
      table.unique(['bookId', 'name']);
    });
}

export async function down(knex: Knex): Promise<Knex.SchemaBuilder> {
  return knex.schema
    .dropTable('books')
    .dropTable('authors')
    .dropTable('books_authors')
    .dropTable('categories')
    .dropTable('books_categories')
    .dropTable('files');
}
