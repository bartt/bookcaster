declare module 's3' {
    export function createClient(options: any): Client;
    export function Client(options: any): void;
    export class Client {
        constructor(options: any);
        s3: any;
        s3Pend: any;
        s3RetryCount: any;
        s3RetryDelay: any;
        deleteObjects(s3Params: any): EventEmitter;
        uploadFile(params: any): EventEmitter;
        downloadFile(params: any): EventEmitter;
        listObjects(params: any): EventEmitter;
        uploadDir(params: any): EventEmitter;
        downloadDir(params: any): EventEmitter;
        deleteDir(s3Params: any): EventEmitter;
        copyObject(_s3Params: any): EventEmitter;
        moveObject(s3Params: any): EventEmitter;
    }
    export function getPublicUrl(bucket: any, key: any, bucketLocation: any): string;
    export function getPublicUrlHttp(bucket: any, key: any): string;
    import EventEmitter_1 = require("events");
    import EventEmitter = EventEmitter_1.EventEmitter;
}