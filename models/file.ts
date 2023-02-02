import Model from "./bookshelf.js";
import Book from "./book.js";

export class File extends Model<File> {
  get tableName() { return 'files'; }

  book() {
    return this.belongsTo(Book)
  }
}

export default File;
