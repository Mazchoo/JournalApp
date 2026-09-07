import { PageElement } from "../page-element";

/** Full-size image shown in the image modal (`#image-preview`). */
export class ImagePreview extends PageElement<HTMLImageElement> {
  constructor() {
    super("image-preview");
  }

  /** Set the preview source. */
  setSrc(src: string): void {
    this.resolve()?.setAttribute("src", src);
  }
}
