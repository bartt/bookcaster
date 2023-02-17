import { BaseModel as Model, ModelObject } from './objection.js';
import { Book } from './book.js';

export class Category extends Model {
  id!: number;
  name!: string;

  static tableName = 'categories';

  static relationMappings = () => ({
    books: {
      relation: Model.ManyToManyRelation,
      modelClass: Book,
      join: {
        from: 'categories.id',
        through: {
          from: 'books_categories.categoryId',
          to: 'books_categories.bookId',
        },
        to: 'books.id',
      },
    },
  });
}

export type CategoryShape = ModelObject<Category>;
