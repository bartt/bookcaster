import Model from "./bookshelf.js";
import Book from "./book.js";

export class Image extends Model<Image> {
  get tableName() { return 'images'; }

  book() {
    return this.belongsTo(Book)
  }
}

export default Image;