import { Author, Category } from "../models";

declare module Search {
  export interface Book {
    id: number,
    title: string,
    description?: string,
    authors: Author[],
    categories: Category[]
  }
}

class Search {
  corpus: Search.Book[];
  input: Element|null;
  by: string;

  constructor(corpus: Search.Book[]) {
    this.corpus = corpus
    this.input = document.querySelector('.search [data-by]')
    this.by = this.input?.getAttribute('data-by') || ''
  }

  listen() {
    this.input?.addEventListener('input', (e) => {
      const phrase = e.target?.value
      const expr = new RegExp(`${phrase}`, 'i')
      const hits = this.corpus.filter((book) => 
        expr.test(book.title) || 
        expr.test(book.description || '') || 
        book.authors.some((author) => expr.test(author.name)) ||
        book.categories.some((category) => expr.test(category.name)))
      const misses = this.corpus.filter((book) => !hits.includes(book))
      hits.forEach((book) => document.querySelectorAll(`#book-${book.id}`).forEach((element) => element.classList.remove('hidden')))
      misses.forEach((book) => document.querySelectorAll(`#book-${book.id}`).forEach((element) => element.classList.add('hidden')))
    })
  }
}

export { Search }