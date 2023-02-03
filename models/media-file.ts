import { BaseModel as Model, ModelObject } from "./objection.js"
import { Book } from "./book.js"
import { JSONSchema, RelationMappings, RelationMappingsThunk } from "objection";
export class MediaFile extends Model {
  id!: number;
  name!: string;
  size!: number;
  duration!: number;
  book!: Book;

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