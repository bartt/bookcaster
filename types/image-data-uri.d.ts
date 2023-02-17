declare module 'image-data-uri' {
    export function decode(dataURI: unknown): {
        imageType: unknown;
        dataBase64: unknown;
        dataBuffer: Buffer;
    };
    export function encode(data: unknown, mediaType: unknown): string;
    export function encodeFromURL(imageURL: unknown, options: unknown): Promise<unknown>;
    export function encodeFromFile(filePath: unknown): Promise<unknown>;
    export function outputFile(dataURI: unknown, filePath: unknown): Promise<unknown>;
}