import { RequestGenericInterface } from 'fastify';

export interface AuthorRequestGeneric extends RequestGenericInterface {
  Params: {
    authorName: string;
  };
}

export interface BookFeedRequestGeneric extends RequestGenericInterface {
  Params: {
    bookName: string;
    ext: string;
  };
}

export interface CategoryRequestGeneric extends RequestGenericInterface {
  Params: {
    categoryName: string;
  };
}

export interface FileRequestGeneric extends RequestGenericInterface {
  Params: {
    bookName: string;
    fileName: string;
  };
}

export interface LastRequestGeneric extends RequestGenericInterface {
  Params: {
    bookCount: number;
  };
}

export interface SyncRequestGeneric extends RequestGenericInterface {
  Querystring: {
    addOnly: boolean;
  };
}

export interface ApiBookRequestGeneric extends RequestGenericInterface {
  Params: {
    bookId: number;
  };
  Body: {
    field: string;
    value: string;
  };
}

export interface ApiBookUpdateAuthorRequestGeneric
  extends RequestGenericInterface {
  Params: {
    bookId: number;
  };
  Body: {
    authorId: number;
  };
}

export interface ApiBookUpdateCategoryRequestGeneric
  extends RequestGenericInterface {
  Params: {
    bookId: number;
  };
  Body: {
    categoryId: number;
  };
}

export interface ApiAuthorsNewRequestGeneric extends RequestGenericInterface {
  Body: {
    name: string;
  };
}

export interface ApiCategoriesNewRequestGeneric
  extends RequestGenericInterface {
  Body: {
    name: string;
  };
}
