import Model from "./bookshelf.js"
import Book from "./book.js";

export class Category extends Model<Category> {
  get tableName() { return 'categories'; }

  books() {
    return this.belongsToMany(Book, 'books_categories')
  }
}

export default Category;
