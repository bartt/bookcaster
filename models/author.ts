import { BaseModel as Model, ModelObject } from "./objection.js"
import { Book } from "./book.js"

export class Author extends Model {
  id!: number
  name!: string
  books?: Book[]
  
  static tableName = 'authors';

  static relationMappings = () => ({
    books: {
      relation: Model.ManyToManyRelation,
      modelClass: Book,
      join: {
        from: 'authors.id',
        through: {
          from: 'books_authors.authorId',
          to: 'books_authors.bookId'
        },
        to: 'books.id'
      }
    }
  });
}

export type AuthorShape = ModelObject<Author>