import Model from "./bookshelf.js"
import Book from "./book.js"

export class Author extends Model<Author> {
  get tableName() { return 'authors'; }

  books() {
    return this.belongsToMany(Book, 'books_authors')
  }
}

export default Author
