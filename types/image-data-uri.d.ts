declare module 'image-data-uri' {
    export function decode(dataURI: any): {
        imageType: any;
        dataBase64: any;
        dataBuffer: Buffer;
    };
    export function encode(data: any, mediaType: any): string;
    export function encodeFromURL(imageURL: any, options: any): Promise<any>;
    export function encodeFromFile(filePath: any): Promise<any>;
    export function outputFile(dataURI: any, filePath: any): Promise<any>;
}