
import { RequestGenericInterface } from 'fastify';

export interface AuthorRequestGeneric extends RequestGenericInterface {
  Params: {
    authorName: string
  }
}

export interface BookFeedRequestGeneric extends RequestGenericInterface {
  Params: {
    bookName: string,
    ext: string
  }
}

export interface CategoryRequestGeneric extends RequestGenericInterface {
  Params: {
    categoryName: string
  }
}

export interface FileRequestGeneric extends RequestGenericInterface {
  Params: {
    bookName: string,
    fileName: string
  }
}

export interface SyncRequestGeneric extends RequestGenericInterface {
    Querystring: {
      addOnly: boolean
    }
  }
  