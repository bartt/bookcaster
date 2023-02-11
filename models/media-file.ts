import * as dotenv from 'dotenv';
dotenv.config()

import { BaseModel as Model, ModelObject } from "./objection.js"
import { Book } from "./book.js"
import { JSONSchema, RelationMappings, RelationMappingsThunk } from "objection";
export class MediaFile extends Model {
  id!: number;
  name!: string;
  size!: number;
  duration!: number;
  date!: Date;
  book!: Book;

  toUrl(protocol: string, hostname: string, bookName: string): string {
    return `${protocol}://${process.env.AUDIO_BOOKS_USER}:${process.env.AUDIO_BOOKS_PASSWORD}@${hostname}/${bookName}/${this.name}`
  }

  static tableName = 'files';

  static relationMappings = () => ({
    book: {
      relation: Model.BelongsToOneRelation,
      modelClass: Book,
      join: {
        from: 'files.bookId',
        to: 'books.id'
      }
    }
  })
}

export type MediaFileShape = ModelObject<MediaFile>