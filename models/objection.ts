import Knex from 'knex';
import Objection from 'objection';
const { Model, ModelObject } = Objection;
import { URL } from 'url';
import config from './knex-config.js';

const knex = Knex(config);
const __dirname = new URL('.', import.meta.url).pathname;

Model.knex(knex);

class BaseModel extends Model {
  static get modelPaths() {
    return [__dirname];
  }
}

export { BaseModel, ModelObject, knex, config };
