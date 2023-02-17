export class CoverImage {
  name!: string;
  size!: number;
  height!: number;
  width!: number;
  dataUri?: string;

  constructor(name: string, size: number, height: number, width: number) {
    this.name = name;
    this.size = size;
    this.height = height;
    this.width = width;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromJson(json: any): CoverImage {
    const coverImage = new CoverImage(
      json.name,
      json.size,
      json.height,
      json.width
    );
    if (json.dataUri) {
      coverImage.dataUri = json.dataUri;
    }
    return coverImage;
  }
}
