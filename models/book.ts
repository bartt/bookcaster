import { BaseModel as Model, ModelObject } from "./objection.js";
import { Author } from "./author.js";
import { Category } from "./category.js";
import { CoverImage } from "./cover-image.js";
import { MediaFile } from "./media-file.js";

export class Book extends Model {
  id!: number
  name!: string
  authors?: Author[]
  categories?: Category[]
  files?: MediaFile[]
  image?: CoverImage
   
  static tableName = 'books';

  static relationMappings = () => ({
    authors: {
      relation: Model.ManyToManyRelation,
      modelClass: Author,
      join: {
        from: 'books.id',
        through: {
          from: 'books_authors.bookId',
          to: 'books_authors.authorId'
        },
        to: 'authors.id'
      }
    },
    categories: {
      relation: Model.ManyToManyRelation,
      modelClass: Category,
      join: {
        from: 'books.id',
        through: {
          from: 'books_categories.bookId',
          to: 'books_categories.categoryId'
        },
        to: 'categories.id'
      }
    }
  });

  static jsonSchema = {
    type: 'object',
    required: ['name'],
    properties: {
      id: { type: 'integer' },
      name: { type: 'string', maxLength: 255 },
      description: { type: 'string' },
      image: {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 255 },
          size: { type: 'integer' },
          height: { type: 'integer' },
          width: { type: 'integer' }
        }
      },
      files: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', maxLength: 255 },
            size: { type: 'integer' },
            duration: { type: 'number' },
          }
        }
      }
    }
  }
}

export type BookShape = ModelObject<Book>;
export default Book;