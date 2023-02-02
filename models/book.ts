import Model from "./bookshelf.js";
import Author from "./author.js";
import Category from "./category.js";
import File from "./file.js";
import Image from "./image.js";

export class Book extends Model<Book> {
    get tableName() {return 'books';}

    categories() {
      return this.belongsToMany(Category, 'books_categories')
    }

    authors() {
      return this.belongsToMany(Author, 'books_authors')
    }

    files() {
      return this.hasMany(File)
    }

    image() {
      return this.hasOne(Image, 'id')
    }

    static dependents = ['files', 'image']
  }
  
export default Book    