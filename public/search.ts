import { Author, Category } from '../models';

declare namespace Search {
  export interface Book {
    id: number;
    title: string;
    description?: string;
    authors: Author[];
    categories: Category[];
  }
}

class Search {
  corpus: Search.Book[];
  input: HTMLInputElement | null;
  by: string;

  constructor(corpus: Search.Book[]) {
    this.corpus = corpus;
    this.input = document.querySelector('.search [data-by]');
    this.by = this.input?.getAttribute('data-by') || '';
  }

  listen(): Search {
    this.input?.addEventListener('input', (e) => {
      const url = new URL(window.location.href);
      const phrase = (e.target as HTMLInputElement)?.value;
      // Show all books when there is no phrase. And remove the search query parameter.
      if (phrase == '') {
        for (const element of document.querySelectorAll('.book')) {
          element.classList.remove('hidden');
        }
        if (url.searchParams.has('q')) {
          url.searchParams.delete('q');
          window.history.pushState({}, '', url);
        }
        return;
      }

      // Set the search query parameter so that the search can be shared/bookmarked.
      const q = url.searchParams.get('q');
      if (q != phrase) {
        url.searchParams.set('q', phrase);
        window.history.pushState({}, '', url);
      }
      const expr = new RegExp(`${phrase}`, 'i');
      const hits = this.corpus.filter(
        (book) =>
          expr.test(book.title) ||
          expr.test(book.description || '') ||
          book.authors.some((author) => expr.test(author.name)) ||
          book.categories.some((category) => expr.test(category.name))
      );
      const misses = this.corpus.filter((book) => !hits.includes(book));
      hits.forEach((book) =>
        document
          .querySelectorAll(`#book-${book.id}`)
          .forEach((element) => element.classList.remove('hidden'))
      );
      misses.forEach((book) =>
        document
          .querySelectorAll(`#book-${book.id}`)
          .forEach((element) => element.classList.add('hidden'))
      );
    });
    window.onpopstate = this.loadQueryParam.bind(this);
    return this;
  }

  loadQueryParam(e: Event | null) {
    const params = new URL(document.location.href).searchParams;
    const query = params.get('q');
    if (this.input) {
      this.input.value = query || '';
      this.input.dispatchEvent(new Event('input'));
    }
  }
}

export { Search };
