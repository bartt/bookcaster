import * as dotenv from 'dotenv';
dotenv.config();

import { BaseModel as Model, ModelObject } from './objection.js';
import { Author } from './author.js';
import { Category } from './category.js';
import { CoverImage } from './cover-image.js';
import { MediaFile } from './media-file.js';

export class Book extends Model {
  id!: number;
  name!: string;
  title?: string;
  description?: string;
  authors?: Author[];
  categories?: Category[];
  image?: CoverImage;
  files?: MediaFile[];

  duration(): number {
    return (this.files || []).reduce((acc, file) => acc + file.duration, 0);
  }

  publication(): Date {
    return (
      (this.files || []).reduce((max: MediaFile, file: MediaFile) =>
        max.date < file.date ? file : max
      ).date || new Date()
    );
  }

  toUrl(protocol: string, hostname: string): string {
    return `${protocol}://${process.env.AUDIO_BOOKS_USER}:${process.env.AUDIO_BOOKS_PASSWORD}@${hostname}/${this.name}`;
  }

  static tableName = 'books';

  static relationMappings = () => ({
    authors: {
      relation: Model.ManyToManyRelation,
      modelClass: Author,
      join: {
        from: 'books.id',
        through: {
          from: 'books_authors.bookId',
          to: 'books_authors.authorId',
        },
        to: 'authors.id',
      },
    },
    categories: {
      relation: Model.ManyToManyRelation,
      modelClass: Category,
      join: {
        from: 'books.id',
        through: {
          from: 'books_categories.bookId',
          to: 'books_categories.categoryId',
        },
        to: 'categories.id',
      },
    },
    files: {
      relation: Model.HasManyRelation,
      modelClass: MediaFile,
      join: {
        from: 'books.id',
        to: 'files.bookId',
      },
    },
  });

  static jsonSchema = {
    type: 'object',
    required: ['name'],
    properties: {
      id: { type: 'integer' },
      name: { type: 'string', maxLength: 255 },
      title: { type: 'string', maxLength: 255 },
      description: { type: 'string' },
      image: {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 255 },
          size: { type: 'integer' },
          height: { type: 'integer' },
          width: { type: 'integer' },
          dataUri: { type: ['string', 'null'] },
        },
      },
    },
  };

  static toTitle(name: string): string {
    return name
      .split('-')
      .map((value) =>
        value.length > 0
          ? value.charAt(0).toUpperCase() + value.slice(1)
          : value
      )
      .join(' ');
  }
}

export type BookShape = ModelObject<Book>;
export default Book;
