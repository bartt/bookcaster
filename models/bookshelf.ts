import Knex from 'knex';
import Bookshelf from 'bookshelf';
import cascadeDelete from 'bookshelf-cascade-delete';
import config from './knex-config.js'

const knex = Knex(config);

const bookshelf = Bookshelf(knex as any);
bookshelf.plugin(cascadeDelete)

const { Model } = bookshelf;

export default Model;
export { bookshelf, knex, config };

