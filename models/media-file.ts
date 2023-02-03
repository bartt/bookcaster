export class MediaFile {
    name!: string;
    size!: number;
    duration!: number;

    constructor(name: string, size: number, duration: number) {
        this.name = name;
        this.size = size;
        this.duration = duration;
    }

    static fromJson(json: any): MediaFile {
        return new MediaFile(json.name, json.size, json.duration);
    }
}