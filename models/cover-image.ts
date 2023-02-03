export class CoverImage {
    name!: string;
    size!: number;
    height!: number;
    width!: number;

    constructor(name: string, size: number, height: number, width: number) {
        this.name = name;
        this.size = size;
        this.height = height;
        this.width = width;
    }

    static fromJson(json: any): CoverImage {
        return new CoverImage(json.name, json.size, json.height, json.width);
    } 
}