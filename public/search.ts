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
      const hits = this.corpus.filter((book) => 
        book.title.includes(phrase) || 
        book.description?.includes(phrase) || 
        book.authors.some((author => author.name.includes(phrase))) ||
        book.categories.some((category) => category.name.includes(phrase)))
      const misses = this.corpus.filter((book) => !hits.includes(book))
      hits.forEach((book) => document.querySelectorAll(`#book-${book.id}`).forEach((element) => element.classList.remove('hidden')))
      misses.forEach((book) => document.querySelectorAll(`#book-${book.id}`).forEach((element) => element.classList.add('hidden')))
    })
  }
}

export { Search }